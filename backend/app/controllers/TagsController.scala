package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*

import scala.concurrent.{ExecutionContext, Future}

import repo.TagRepository
import models.JsonCodecs.given
import models.CreateOrUpdateNamedEntityRequest
import modules.{AuthedRequest, AuthenticatedAction}

@Singleton
final class TagsController @Inject() (
  cc: ControllerComponents,
  repo: TagRepository,
  auth: AuthenticatedAction
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def list: Action[AnyContent] = auth.async { req: AuthedRequest[AnyContent] =>
    repo.list(req.user.id).map(tags => Ok(Json.toJson(tags)))
  }

  def create: Action[JsValue] = auth(parse.json).async { req: AuthedRequest[JsValue] =>
    req.body.validate[CreateOrUpdateNamedEntityRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        repo.create(req.user.id, body.name.trim).map(t => Created(Json.toJson(t))).recover { case t =>
          ApiErrorHandling.mapDbException(t)
        }
    )
  }

  def update(id: Long): Action[JsValue] = auth(parse.json).async { req: AuthedRequest[JsValue] =>
    req.body.validate[CreateOrUpdateNamedEntityRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        repo.update(req.user.id, id, body.name.trim).map {
          case None => NotFound
          case Some(t) => Ok(Json.toJson(t))
        }.recover { case t => ApiErrorHandling.mapDbException(t) }
    )
  }

  def delete(id: Long): Action[AnyContent] = auth.async { req: AuthedRequest[AnyContent] =>
    repo.delete(req.user.id, id).map {
      case true => NoContent
      case false => NotFound
    }
  }
}
