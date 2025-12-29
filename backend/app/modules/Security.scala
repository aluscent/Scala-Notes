package modules

import javax.inject.{Inject, Singleton}
import play.api.mvc.*
import scala.concurrent.{ExecutionContext, Future}
import models.User
import repo.UserRepository

final case class AuthedRequest[A](user: User, request: Request[A]) extends WrappedRequest[A](request)

@Singleton
final class AuthenticatedAction @Inject() (
  bodyParsers: BodyParsers.Default,
  userRepo: UserRepository
)(using ec: ExecutionContext)
  extends ActionBuilder[AuthedRequest, AnyContent]
    with ActionRefiner[Request, AuthedRequest] {

  override def parser: BodyParser[AnyContent] = bodyParsers
  override protected def executionContext: ExecutionContext = ec

  override protected def refine[A](request: Request[A]): Future[Either[Result, AuthedRequest[A]]] = {
    val maybeId = request.session.get("uid").flatMap(s => s.toLongOption)
    maybeId match
      case None => Future.successful(Left(Results.Unauthorized(play.api.libs.json.Json.obj("error" -> "Unauthorized"))))
      case Some(id) =>
        userRepo.findById(id).map {
          case None => Left(Results.Unauthorized(play.api.libs.json.Json.obj("error" -> "Unauthorized")))
          case Some(u) => Right(AuthedRequest(u, request))
        }
  }
}
