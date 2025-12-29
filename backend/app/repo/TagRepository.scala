package repo

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

import models.Tag

@Singleton
final class TagRepository @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*
  private val t = dbs.tables

  def list(userId: Long): Future[Seq[models.Tag]] =
    dbs.db.run(t.tags.filter(_.userId === userId).sortBy(_.name.asc).result).map(_.map(r => Tag(r.id, r.name)))

  def create(userId: Long, name: String): Future[models.Tag] =
    dbs.db.run((t.tags returning t.tags.map(_.id) into ((row, id) => row.copy(id = id))) += t.TagRow(userId = userId, name = name))
      .map(r => Tag(r.id, r.name))

  def update(userId: Long, id: Long, name: String): Future[Option[models.Tag]] = {
    val q = t.tags.filter(tg => tg.id === id && tg.userId === userId).map(_.name).update(name)
    dbs.db.run(q).flatMap {
      case 0 => Future.successful(None)
      case _ => dbs.db.run(t.tags.filter(tg => tg.id === id && tg.userId === userId).result.head).map(r => Some(Tag(r.id, r.name)))
    }
  }

  def delete(userId: Long, id: Long): Future[Boolean] =
    dbs.db.run(t.tags.filter(tg => tg.id === id && tg.userId === userId).delete).map(_ > 0)
}
