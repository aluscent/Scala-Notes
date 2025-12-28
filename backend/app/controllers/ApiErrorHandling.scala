package controllers

import org.h2.jdbc.JdbcSQLIntegrityConstraintViolationException
import play.api.libs.json.Json
import play.api.mvc.Result
import play.api.mvc.Results.*

object ApiErrorHandling {

  private def err(msg: String): Result =
    BadRequest(Json.obj("error" -> msg)).as("application/json")

  private def conflict(msg: String): Result =
    Conflict(Json.obj("error" -> msg)).as("application/json")

  def mapDbException(t: Throwable): Result = {
    val root = rootCause(t)

    root match {
      case e: JdbcSQLIntegrityConstraintViolationException =>
        val msg = Option(e.getMessage).getOrElse("").toLowerCase
        if (msg.contains("unique") || msg.contains("uk_") || msg.contains("unique index"))
          conflict("Duplicate name or unique constraint violation")
        else if (msg.contains("foreign key") || msg.contains("referential"))
          err("Invalid reference (category/tag id does not exist)")
        else
          err("Constraint violation")

      case _ =>
        InternalServerError(Json.obj("error" -> "Unexpected server error")).as("application/json")
    }
  }

  private def rootCause(t: Throwable): Throwable = {
    var cur = t
    while (cur.getCause != null && cur.getCause != cur) {
      cur = cur.getCause
    }
    cur
  }
}
