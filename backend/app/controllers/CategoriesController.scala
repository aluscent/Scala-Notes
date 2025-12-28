package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*

import scala.concurrent.{ExecutionContext, Future}

import repo.CategoryRepository
import models.JsonCodecs.given
import models.CreateOrUpdateNamedEntityRequest

@Singleton
final class CategoriesController @Inject() (
  cc: ControllerComponents,
  repo: CategoryRepository
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def list: Action[AnyContent] = Action.async {
    repo.list().map(cats => Ok(Json.toJson(cats)))
  }

  def create: Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[CreateOrUpdateNamedEntityRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body =>
        repo.create(body.name.trim).map(c => Created(Json.toJson(c))).recover { case t =>
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
          case Some(c) => Ok(Json.toJson(c))
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
