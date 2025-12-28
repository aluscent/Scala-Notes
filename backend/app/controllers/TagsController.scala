package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*

import scala.concurrent.{ExecutionContext, Future}

import repo.TagRepository
import models.JsonCodecs.given
import models.CreateOrUpdateNamedEntityRequest

@Singleton
final class TagsController @Inject() (
  cc: ControllerComponents,
  repo: TagRepository
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def list: Action[AnyContent] = Action.async {
    repo.list().map(tags => Ok(Json.toJson(tags)))
  }

  def create: Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[CreateOrUpdateNamedEntityRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        repo.create(body.name.trim).map(t => Created(Json.toJson(t))).recover { case t =>
          ApiErrorHandling.mapDbException(t)
        }
    )
  }

  def update(id: Long): Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[CreateOrUpdateNamedEntityRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        repo.update(id, body.name.trim).map {
          case None => NotFound
          case Some(t) => Ok(Json.toJson(t))
        }.recover { case t => ApiErrorHandling.mapDbException(t) }
    )
  }

  def delete(id: Long): Action[AnyContent] = Action.async {
    repo.delete(id).map {
      case true => NoContent
      case false => NotFound
    }
  }
}
