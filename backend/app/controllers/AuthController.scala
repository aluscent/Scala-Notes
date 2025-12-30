package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*
import scala.concurrent.{ExecutionContext, Future}

import modules.{AuthService, AuthedRequest, AuthenticatedAction}
import models.{AuthResponse, JsonCodecs, LoginRequest, SignupRequest}
import models.JsonCodecs.given
import play.filters.csrf.{CSRF, CSRFAddToken}

@Singleton
final class AuthController @Inject() (
  cc: ControllerComponents,
  authService: AuthService,
  authAction: AuthenticatedAction,
  addToken: CSRFAddToken
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def signup: Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[SignupRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        authService.signup(body).map {
          case Left(err) => Conflict(Json.obj("error" -> err))
          case Right(auth) => withSession(auth)
        }
    )
  }

  def login: Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[LoginRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        authService.login(body).map {
          case Left(err) => Unauthorized(Json.obj("error" -> err))
          case Right(auth) => withSession(auth)
        }
    )
  }

  def me: Action[AnyContent] = authAction { req: AuthedRequest[AnyContent] =>
    Ok(Json.toJson(AuthResponse(req.user)))
  }

  def csrf: Action[AnyContent] = addToken(Action { implicit request =>
    CSRF.getToken(request) match
      case Some(token) => Ok(Json.obj("token" -> token.value))
      case None => InternalServerError(Json.obj("error" -> "CSRF token missing"))
  })

  def logout: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("status" -> "ok")).withNewSession
  }

  private def withSession(auth: AuthResponse): Result = {
    Ok(Json.toJson(auth)).withSession("uid" -> auth.user.id.toString)
  }
}
