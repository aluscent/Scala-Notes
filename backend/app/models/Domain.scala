package models

import play.api.libs.json.*

import java.time.Instant

final case class Category(id: Long, name: String)
final case class Tag(id: Long, name: String)

final case class Note(
  id: Long,
  title: String,
  content: String,
  categories: Seq[Category],
  tags: Seq[Tag],
  createdAt: Instant,
  updatedAt: Instant
)

// Requests
final case class CreateOrUpdateNoteRequest(
  title: String,
  content: String,
  categoryIds: Seq[Long],
  tagIds: Seq[Long]
)

final case class CreateOrUpdateNamedEntityRequest(name: String)

// JSON
object JsonCodecs {
  given Writes[Instant] = Writes { i => JsString(i.toString) }
  given Reads[Instant] = Reads {
    case JsString(s) =>
      try JsSuccess(Instant.parse(s))
      catch case _: Throwable => JsError("Invalid ISO-8601 instant")
    case _ => JsError("Expected string")
  }

  given OFormat[Category] = Json.format[Category]
  given OFormat[Tag] = Json.format[Tag]
  given OFormat[Note] = Json.format[Note]

  given Reads[CreateOrUpdateNoteRequest] = Json.reads[CreateOrUpdateNoteRequest]
  given Reads[CreateOrUpdateNamedEntityRequest] = Json.reads[CreateOrUpdateNamedEntityRequest]
}
