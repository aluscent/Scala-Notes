package modules

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}
import java.time.LocalDate

import de.mkammerer.argon2.{Argon2, Argon2Factory}
import de.mkammerer.argon2.Argon2Factory.Argon2Types
import play.api.Configuration

import models.{AuthResponse, LoginRequest, SignupRequest, User}
import repo.UserRepository

@Singleton
final class AuthService @Inject() (userRepo: UserRepository, configuration: Configuration)(using ec: ExecutionContext) {

  private val argon2: Argon2 = Argon2Factory.create(
    Argon2Types.ARGON2id,
    configuration.getOptional[Int]("security.argon2.saltLength").getOrElse(16),
    configuration.getOptional[Int]("security.argon2.hashLength").getOrElse(32)
  )

  private val iterations = configuration.getOptional[Int]("security.argon2.iterations").getOrElse(3)
  private val memoryKb = configuration.getOptional[Int]("security.argon2.memoryKb").getOrElse(65536)
  private val parallelism = configuration.getOptional[Int]("security.argon2.parallelism").getOrElse(1)
  private val maxDailyAttempts = configuration.getOptional[Int]("security.login.maxDailyAttempts").getOrElse(3)

  def signup(req: SignupRequest): Future[Either[String, AuthResponse]] = {
    val normalizedEmail = req.email.trim.toLowerCase
    if !normalizedEmail.contains("@") then return Future.successful(Left("Invalid email"))
    if req.password.length < 8 then return Future.successful(Left("Password must be at least 8 characters"))

    val hash = argon2.hash(iterations, memoryKb, parallelism, req.password.toCharArray)
    userRepo.create(normalizedEmail, hash).map(u => Right(AuthResponse(u))).recover { case _: Throwable =>
      Left("Email already registered")
    }
  }

  def login(req: LoginRequest): Future[Either[String, AuthResponse]] = {
    val normalizedEmail = req.email.trim.toLowerCase
    userRepo.findByEmail(normalizedEmail).flatMap {
      case None => Future.successful(Left("Invalid credentials"))
      case Some((user, hash, attempts, lastFailed)) =>
        val today = LocalDate.now()
        if lastFailed.contains(today) && attempts >= maxDailyAttempts then
          Future.successful(Left(s"Too many attempts today. Try again tomorrow."))
        else
          verifyPassword(user, hash, attempts, lastFailed, req.password)
    }
  }

  private def verifyPassword(user: User, hash: String, attempts: Int, lastFailed: Option[LocalDate], raw: String): Future[Either[String, AuthResponse]] = {
    val ok = argon2.verify(hash, raw.toCharArray)
    if ok then
      userRepo.resetFailedAttempts(user.id).map(_ => Right(AuthResponse(user)))
    else {
      val today = LocalDate.now()
      val resetCount = lastFailed.forall(_ != today)
      val newAttempts = if resetCount then 1 else attempts + 1
      userRepo.updateFailedAttempt(user.id, newAttempts, today).map { _ =>
        Left(if newAttempts >= maxDailyAttempts then "Too many attempts today. Try again tomorrow." else "Invalid credentials")
      }
    }
  }
}
