package controllers

import javax.inject.*
import play.api.mvc.*
import play.api.libs.json.*

import scala.concurrent.{ExecutionContext, Future}

import repo.NotesRepository
import models.JsonCodecs.given
import models.CreateOrUpdateNoteRequest
import modules.{AuthedRequest, AuthenticatedAction}

@Singleton
final class NotesController @Inject() (
  cc: ControllerComponents,
  repo: NotesRepository,
  auth: AuthenticatedAction
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def list(q: Option[String], categoryId: Option[Long], tagId: Option[Long]): Action[AnyContent] = auth.async { req: AuthedRequest[AnyContent] =>
    repo.list(req.user.id, q, categoryId, tagId).map(notes => Ok(Json.toJson(notes)))
  }

  def get(id: Long): Action[AnyContent] = auth.async { req: AuthedRequest[AnyContent] =>
    repo.get(req.user.id, id).map {
      case None => NotFound
      case Some(note) => Ok(Json.toJson(note))
    }
  }

  def create: Action[JsValue] = auth(parse.json).async { req: AuthedRequest[JsValue] =>
    req.body.validate[CreateOrUpdateNoteRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body => validateTitle(body.title) match
        case Left(err) => Future.successful(err)
        case Right(cleanTitle) =>
          repo
            .create(
              userId = req.user.id,
              title = cleanTitle,
              content = body.content,
              categoryIds = body.categoryIds,
              tagIds = body.tagIds
            )
            .map(note => Created(Json.toJson(note)))
            .recover { case t => ApiErrorHandling.mapDbException(t) }
    )
  }

  def update(id: Long): Action[JsValue] = auth(parse.json).async { req: AuthedRequest[JsValue] =>
    req.body.validate[CreateOrUpdateNoteRequest].fold(
      errs => Future.successful(BadRequest(JsError.toJson(errs))),
      body => validateTitle(body.title) match
        case Left(err) => Future.successful(err)
        case Right(cleanTitle) =>
          repo
            .update(
              userId = req.user.id,
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

  def delete(id: Long): Action[AnyContent] = auth.async { req: AuthedRequest[AnyContent] =>
    repo.delete(req.user.id, id).map {
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
