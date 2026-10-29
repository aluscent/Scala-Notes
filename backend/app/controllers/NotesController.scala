package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*

import scala.concurrent.{ExecutionContext, Future}

import repo.NotesRepository
import models.JsonCodecs.given
import models.CreateOrUpdateNoteRequest

@Singleton
final class NotesController @Inject() (
  cc: ControllerComponents,
  repo: NotesRepository
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def list(q: Option[String], categoryId: Option[Long], tagId: Option[Long], limit: Int, offset: Int): Action[AnyContent] = Action.async {
    if (limit < 1 || limit > 100 || offset < 0)
      Future.successful(BadRequest(Json.obj("error" -> "limit must be 1..100 and offset must be non-negative")))
    else repo.list(q, categoryId, tagId, limit, offset).map(notes => Ok(Json.toJson(notes)))
  }

  def get(id: Long): Action[AnyContent] = Action.async {
    repo.get(id).map {
      case None => NotFound
      case Some(note) => Ok(Json.toJson(note))
    }
  }

  def create: Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[CreateOrUpdateNoteRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body => validateTitle(body.title) match
        case Left(err) => Future.successful(err)
        case Right(cleanTitle) =>
          repo
            .create(
              title = cleanTitle,
              content = body.content,
              categoryIds = body.categoryIds,
              tagIds = body.tagIds
            )
            .map(note => Created(Json.toJson(note)))
            .recover { case t => ApiErrorHandling.mapDbException(t) }
    )
  }

  def update(id: Long): Action[JsValue] = Action(parse.json).async { req =>
    req.body.validate[CreateOrUpdateNoteRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body => validateTitle(body.title) match
        case Left(err) => Future.successful(err)
        case Right(cleanTitle) =>
          repo
            .update(
              id = id,
              title = cleanTitle,
              content = body.content,
              categoryIds = body.categoryIds,
              tagIds = body.tagIds
            )
            .map {
              case None => NotFound
              case Some(note) => Ok(Json.toJson(note))
            }
            .recover { case t => ApiErrorHandling.mapDbException(t) }
    )
  }

  def delete(id: Long): Action[AnyContent] = Action.async {
    repo.delete(id).map {
      case true => NoContent
      case false => NotFound
    }
  }

  private def validateTitle(title: String): Either[Result, String] = {
    val clean = title.trim
    if clean.isEmpty then Left(BadRequest(Json.obj("error" -> "Title cannot be empty")))
    else Right(clean)
  }
}
