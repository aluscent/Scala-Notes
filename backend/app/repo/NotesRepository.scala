package repo

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

import models.{Category, Note, Tag}

import java.time.Instant

@Singleton
final class NotesRepository @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*
  private val notesTables = dbs.tables

  def list(q: Option[String], categoryId: Option[Long], tagId: Option[Long]): Future[Seq[Note]] = {
    val base0 = notesTables.notes

    val base1 = q.filter(_.trim.nonEmpty) match {
      case None => base0
      case Some(term) =>
        val needle = "%" + term.trim.toLowerCase + "%"
        base0.filter(n => n.title.toLowerCase.like(needle))
    }

    val base2 = categoryId match {
      case None => base1
      case Some(cid) =>
        base1.filter { n =>
          notesTables.noteCategories.filter(nc => nc.noteId === n.id && nc.categoryId === cid).exists
        }
    }

    val base3 = tagId match {
      case None => base2
      case Some(tid) =>
        base2.filter { n =>
          notesTables.noteTags.filter(nt => nt.noteId === n.id && nt.tagId === tid).exists
        }
    }

    val notesQ = base3.sortBy(_.updatedAt.desc).result

    val action = for {
      noteRows <- notesQ
      noteIds = noteRows.map(_.id)
      cats <- fetchCategories(noteIds)
      tags <- fetchTags(noteIds)
    } yield {
      noteRows.map { r =>
        Note(
          id = r.id,
          title = r.title,
          content = r.content,
          categories = cats.getOrElse(r.id, Seq.empty),
          tags = tags.getOrElse(r.id, Seq.empty),
          createdAt = r.createdAt,
          updatedAt = r.updatedAt
        )
      }
    }

    dbs.db.run(action)
  }

  def get(id: Long): Future[Option[Note]] = {
    val action = for {
      noteOpt <- notesTables.notes.filter(_.id === id).result.headOption
      cats <- fetchCategories(Seq(id))
      tags <- fetchTags(Seq(id))
    } yield noteOpt.map { r =>
      Note(
        id = r.id,
        title = r.title,
        content = r.content,
        categories = cats.getOrElse(r.id, Seq.empty),
        tags = tags.getOrElse(r.id, Seq.empty),
        createdAt = r.createdAt,
        updatedAt = r.updatedAt
      )
    }

    dbs.db.run(action)
  }

  def create(title: String, content: String, categoryIds: Seq[Long], tagIds: Seq[Long]): Future[Note] = {
    val now = Instant.now()
    val insertNote =
      (notesTables.notes returning notesTables.notes.map(_.id) into ((row, id) => row.copy(id = id))) +=
        notesTables.NoteRow(title = title, content = content, createdAt = now, updatedAt = now)

    val action = (for {
      noteRow <- insertNote
      _ <- replaceNoteCategories(noteRow.id, categoryIds)
      _ <- replaceNoteTags(noteRow.id, tagIds)
      note <- getNoteAsAction(noteRow.id)
    } yield note).transactionally

    dbs.db.run(action)
  }

  def update(id: Long, title: String, content: String, categoryIds: Seq[Long], tagIds: Seq[Long]): Future[Option[Note]] = {
    val now = Instant.now()

    val updateNote = notesTables.notes
      .filter(_.id === id)
      .map(n => (n.title, n.content, n.updatedAt))
      .update((title, content, now))

    val action = (for {
      updated <- updateNote
      res <-
        if (updated == 0) DBIO.successful(Option.empty[Note])
        else for {
          _ <- replaceNoteCategories(id, categoryIds)
          _ <- replaceNoteTags(id, tagIds)
          note <- getNoteAsAction(id).map(Some(_))
        } yield note
    } yield res).transactionally

    dbs.db.run(action)
  }

  def delete(id: Long): Future[Boolean] =
    dbs.db.run(notesTables.notes.filter(_.id === id).delete).map(_ > 0)

  // --- helpers

  private def replaceNoteCategories(noteId: Long, categoryIds: Seq[Long]): DBIO[Int] = {
    val normalized = categoryIds.distinct
    for {
      _ <- notesTables.noteCategories.filter(_.noteId === noteId).delete
      inserted <- notesTables.noteCategories ++= normalized.map(cid => (noteId, cid))
    } yield inserted.getOrElse(0)
  }

  private def replaceNoteTags(noteId: Long, tagIds: Seq[Long]): DBIO[Int] = {
    val normalized = tagIds.distinct
    val insertAction: DBIO[Option[Int]] =
      if (normalized.isEmpty) DBIO.successful(Some(0))
      else notesTables.noteTags ++= normalized.map(tid => (noteId, tid))
    for {
      _ <- notesTables.noteTags.filter(_.noteId === noteId).delete
      inserted <- insertAction
    } yield inserted.getOrElse(0)
  }

  private def fetchCategories(noteIds: Seq[Long]): DBIO[Map[Long, Seq[Category]]] =
    if (noteIds.isEmpty) DBIO.successful(Map.empty)
    else {
      val q =
        notesTables.noteCategories
          .filter(_.noteId inSetBind noteIds)
          .join(notesTables.categories)
          .on((a, b) => a.categoryId === b.id)
          .map { case (nc, c) => (nc.noteId, c.id, c.name) }
          .result

      q.map { rows =>
        rows.groupMap(_._1) { case (_, cid, name) => Category(cid, name) }
          .view.mapValues(_.sortBy(_.name)).toMap
      }
    }

  private def fetchTags(noteIds: Seq[Long]): DBIO[Map[Long, Seq[models.Tag]]] =
    if (noteIds.isEmpty) DBIO.successful(Map.empty)
    else {
      val q =
        notesTables.noteTags
          .filter(_.noteId inSetBind noteIds)
          .join(notesTables.tags)
          .on((a, b) => a.tagId === b.id)
          .map { case (nt, tag) => (nt.noteId, tag.id, tag.name) }
          .result

      q.map { rows =>
        rows.groupMap(_._1) { case (_, tid, name) => models.Tag(tid, name) }
          .view.mapValues(_.sortBy(_.name)).toMap
      }
    }

  private def getNoteAsAction(id: Long): DBIO[Note] = {
    val action = for {
      noteRow <- notesTables.notes.filter(_.id === id).result.head
      cats <- fetchCategories(Seq(id))
      tags <- fetchTags(Seq(id))
    } yield Note(
      id = noteRow.id,
      title = noteRow.title,
      content = noteRow.content,
      categories = cats.getOrElse(id, Seq.empty),
      tags = tags.getOrElse(id, Seq.empty),
      createdAt = noteRow.createdAt,
      updatedAt = noteRow.updatedAt
    )
    action
  }
}
