package db

import slick.jdbc.JdbcProfile

import java.time.Instant
import java.sql.Timestamp

final class Tables(val profile: JdbcProfile) {
  import profile.api.*

  // Instant <-> Timestamp mapping (portable across profiles)
  given instantColumnType: BaseColumnType[Instant] =
    MappedColumnType.base[Instant, Timestamp](i => Timestamp.from(i), ts => ts.toInstant)

  final case class CategoryRow(id: Long = 0L, name: String)
  final case class TagRow(id: Long = 0L, name: String)
  final case class NoteRow(
    id: Long = 0L,
    title: String,
    content: String,
    createdAt: Instant,
    updatedAt: Instant
  )

  final class CategoriesTable(tag: Tag) extends Table[CategoryRow](tag, "CATEGORIES") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def name = column[String]("NAME")

    def * = (id, name).mapTo[CategoryRow]
    def nameIdx = index("UK_CATEGORIES_NAME", name, unique = true)
  }

  final class TagsTable(tag: Tag) extends Table[TagRow](tag, "TAGS") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def name = column[String]("NAME")

    def * = (id, name).mapTo[TagRow]
    def nameIdx = index("UK_TAGS_NAME", name, unique = true)
  }

  final class NotesTable(tag: Tag) extends Table[NoteRow](tag, "NOTES") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def title = column[String]("TITLE")
    def content = column[String]("CONTENT")
    def createdAt = column[Instant]("CREATED_AT")
    def updatedAt = column[Instant]("UPDATED_AT")

    def * = (id, title, content, createdAt, updatedAt).mapTo[NoteRow]
    def titleIdx = index("IDX_NOTES_TITLE", title)
  }

  final class NoteCategoriesTable(tag: Tag) extends Table[(Long, Long)](tag, "NOTE_CATEGORIES") {
    def noteId = column[Long]("NOTE_ID")
    def categoryId = column[Long]("CATEGORY_ID")
    def pk = primaryKey("PK_NOTE_CATEGORIES", (noteId, categoryId))

    def * = (noteId, categoryId)

    def noteFk = foreignKey("FK_NOTE_CATEGORIES_NOTE", noteId, notes)(_.id, onDelete = ForeignKeyAction.Cascade)
    def categoryFk = foreignKey("FK_NOTE_CATEGORIES_CATEGORY", categoryId, categories)(_.id, onDelete = ForeignKeyAction.Cascade)
  }

  final class NoteTagsTable(tag: Tag) extends Table[(Long, Long)](tag, "NOTE_TAGS") {
    def noteId = column[Long]("NOTE_ID")
    def tagId = column[Long]("TAG_ID")
    def pk = primaryKey("PK_NOTE_TAGS", (noteId, tagId))

    def * = (noteId, tagId)

    def noteFk = foreignKey("FK_NOTE_TAGS_NOTE", noteId, notes)(_.id, onDelete = ForeignKeyAction.Cascade)
    def tagFk = foreignKey("FK_NOTE_TAGS_TAG", tagId, tags)(_.id, onDelete = ForeignKeyAction.Cascade)
  }

  // TableQuery
  val categories = TableQuery[CategoriesTable]
  val tags = TableQuery[TagsTable]
  val notes = TableQuery[NotesTable]
  val noteCategories = TableQuery[NoteCategoriesTable]
  val noteTags = TableQuery[NoteTagsTable]
}
