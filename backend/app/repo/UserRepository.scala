package repo

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}
import java.time.LocalDate

import models.User

@Singleton
final class UserRepository @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*
  private val t = dbs.tables

  def findByEmail(email: String): Future[Option[(User, String, Int, Option[LocalDate])]] = {
    val q = t.users.filter(_.email.toLowerCase === email.toLowerCase).result.headOption
    dbs.db.run(q).map(_.map(r => (User(r.id, r.email), r.passwordHash, r.failedAttempts, r.lastFailed)))
  }

  def findById(id: Long): Future[Option[User]] =
    dbs.db.run(t.users.filter(_.id === id).result.headOption).map(_.map(r => User(r.id, r.email)))

  def create(email: String, passwordHash: String): Future[User] = {
    val insert =
      (t.users returning t.users.map(_.id) into ((row, id) => row.copy(id = id))) +=
        t.UserRow(email = email.toLowerCase, passwordHash = passwordHash, failedAttempts = 0, lastFailed = None)
    dbs.db.run(insert).map(r => User(r.id, r.email))
  }

  def updateFailedAttempt(userId: Long, attempts: Int, date: LocalDate): Future[Int] = {
    val q = t.users.filter(_.id === userId).map(u => (u.failedAttempts, u.lastFailed)).update((attempts, Some(date)))
    dbs.db.run(q)
  }

  def resetFailedAttempts(userId: Long): Future[Int] = {
    val q = t.users.filter(_.id === userId).map(u => (u.failedAttempts, u.lastFailed)).update((0, None))
    dbs.db.run(q)
  }
}
