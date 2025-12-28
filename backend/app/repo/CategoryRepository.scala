package repo

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

import models.Category

@Singleton
final class CategoryRepository @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*
  private val t = dbs.tables

  def list(): Future[Seq[Category]] =
    dbs.db.run(t.categories.sortBy(_.name.asc).result).map(_.map(r => Category(r.id, r.name)))

  def create(name: String): Future[Category] =
    dbs.db.run((t.categories returning t.categories.map(_.id) into ((row, id) => row.copy(id = id))) += t.CategoryRow(name = name))
      .map(r => Category(r.id, r.name))

  def update(id: Long, name: String): Future[Option[Category]] = {
    val q = t.categories.filter(_.id === id).map(_.name).update(name)
    dbs.db.run(q).flatMap {
      case 0 => Future.successful(None)
      case _ => dbs.db.run(t.categories.filter(_.id === id).result.head).map(r => Some(Category(r.id, r.name)))
    }
  }

  def delete(id: Long): Future[Boolean] =
    dbs.db.run(t.categories.filter(_.id === id).delete).map(_ > 0)
}
