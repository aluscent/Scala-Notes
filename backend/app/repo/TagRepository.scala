package repo

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

import models.Tag

@Singleton
final class TagRepository @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*
  private val t = dbs.tables

  def list(): Future[Seq[models.Tag]] =
    dbs.db.run(t.tags.sortBy(_.name.asc).result).map(_.map(r => Tag(r.id, r.name)))

  def create(name: String): Future[models.Tag] =
    dbs.db.run((t.tags returning t.tags.map(_.id) into ((row, id) => row.copy(id = id))) += t.TagRow(name = name))
      .map(r => Tag(r.id, r.name))

  def update(id: Long, name: String): Future[Option[models.Tag]] = {
    val q = t.tags.filter(_.id === id).map(_.name).update(name)
    dbs.db.run(q).flatMap {
      case 0 => Future.successful(None)
      case _ => dbs.db.run(t.tags.filter(_.id === id).result.head).map(r => Some(Tag(r.id, r.name)))
    }
  }

  def delete(id: Long): Future[Boolean] =
    dbs.db.run(t.tags.filter(_.id === id).delete).map(_ > 0)
}
