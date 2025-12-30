package db

import slick.jdbc.JdbcProfile

import java.time.{Instant, LocalDate}
import java.sql.{Date, Timestamp}

final class Tables(val profile: JdbcProfile) {
  import profile.api.*

  // Instant <-> Timestamp mapping (portable across profiles)
  given instantColumnType: BaseColumnType[Instant] =
    MappedColumnType.base[Instant, Timestamp](i => Timestamp.from(i), ts => ts.toInstant)

  given localDateColumnType: BaseColumnType[LocalDate] =
    MappedColumnType.base[LocalDate, Date](d => Date.valueOf(d), d => d.toLocalDate)

  final case class UserRow(
    id: Long = 0L,
    email: String,
    passwordHash: String,
    failedAttempts: Int,
    lastFailed: Option[LocalDate]
  )

  final case class CategoryRow(id: Long = 0L, userId: Long, name: String)
  final case class TagRow(id: Long = 0L, userId: Long, name: String)
  final case class NoteRow(
    id: Long = 0L,
    userId: Long,
    title: String,
    content: String,
    createdAt: Instant,
    updatedAt: Instant
  )

  final class UsersTable(tag: Tag) extends Table[UserRow](tag, "USERS") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def email = column[String]("EMAIL")
    def passwordHash = column[String]("PASSWORD_HASH")
    def failedAttempts = column[Int]("FAILED_ATTEMPTS")
    def lastFailed = column[Option[LocalDate]]("LAST_FAILED")

    def * = (id, email, passwordHash, failedAttempts, lastFailed).mapTo[UserRow]

    def emailIdx = index("UK_USERS_EMAIL", email, unique = true)
  }

  final class CategoriesTable(tag: Tag) extends Table[CategoryRow](tag, "CATEGORIES") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def userId = column[Long]("USER_ID")
    def name = column[String]("NAME")

    def userFk = foreignKey("FK_CATEGORIES_USER", userId, users)(_.id, onDelete = ForeignKeyAction.Cascade)

    def * = (id, userId, name).mapTo[CategoryRow]
    def nameIdx = index("UK_CATEGORIES_USER_NAME", (userId, name), unique = true)
    def idOwnerIdx = index("UK_CATEGORIES_ID_USER", (id, userId), unique = true)

  }

  final class TagsTable(tag: Tag) extends Table[TagRow](tag, "TAGS") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def userId = column[Long]("USER_ID")
    def name = column[String]("NAME")

    def userFk = foreignKey("FK_TAGS_USER", userId, users)(_.id, onDelete = ForeignKeyAction.Cascade)

    def * = (id, userId, name).mapTo[TagRow]
    def nameIdx = index("UK_TAGS_USER_NAME", (userId, name), unique = true)
    def idOwnerIdx = index("UK_TAGS_ID_USER", (id, userId), unique = true)

  }

  final class NotesTable(tag: Tag) extends Table[NoteRow](tag, "NOTES") {
    def id = column[Long]("ID", O.PrimaryKey, O.AutoInc)
    def userId = column[Long]("USER_ID")
    def title = column[String]("TITLE")
    def content = column[String]("CONTENT")
    def createdAt = column[Instant]("CREATED_AT")
    def updatedAt = column[Instant]("UPDATED_AT")

    def * = (id, userId, title, content, createdAt, updatedAt).mapTo[NoteRow]
    def titleIdx = index("IDX_NOTES_USER_TITLE", (userId, title))
    def userFk = foreignKey("FK_NOTES_USER", userId, users)(_.id, onDelete = ForeignKeyAction.Cascade)
    def idOwnerIdx = index("UK_NOTES_ID_USER", (id, userId), unique = true)
  }

  final class NoteCategoriesTable(tag: Tag) extends Table[(Long, Long, Long)](tag, "NOTE_CATEGORIES") {
    def noteId = column[Long]("NOTE_ID")
    def categoryId = column[Long]("CATEGORY_ID")
    def userId = column[Long]("USER_ID")
    def pk = primaryKey("PK_NOTE_CATEGORIES", (noteId, categoryId, userId))

    def * = (noteId, categoryId, userId)

    def noteFk = foreignKey("FK_NOTE_CATEGORIES_NOTE", (noteId, userId), notes)(n => (n.id, n.userId), onDelete = ForeignKeyAction.Cascade)
    def categoryFk = foreignKey("FK_NOTE_CATEGORIES_CATEGORY", (categoryId, userId), categories)(c => (c.id, c.userId), onDelete = ForeignKeyAction.Cascade)
  }

  final class NoteTagsTable(tag: Tag) extends Table[(Long, Long, Long)](tag, "NOTE_TAGS") {
    def noteId = column[Long]("NOTE_ID")
    def tagId = column[Long]("TAG_ID")
    def userId = column[Long]("USER_ID")
    def pk = primaryKey("PK_NOTE_TAGS", (noteId, tagId, userId))

    def * = (noteId, tagId, userId)

    def noteFk = foreignKey("FK_NOTE_TAGS_NOTE", (noteId, userId), notes)(n => (n.id, n.userId), onDelete = ForeignKeyAction.Cascade)
    def tagFk = foreignKey("FK_NOTE_TAGS_TAG", (tagId, userId), tags)(t => (t.id, t.userId), onDelete = ForeignKeyAction.Cascade)
  }

  // TableQuery
  val users = TableQuery[UsersTable]
  val categories = TableQuery[CategoriesTable]
  val tags = TableQuery[TagsTable]
  val notes = TableQuery[NotesTable]
  val noteCategories = TableQuery[NoteCategoriesTable]
  val noteTags = TableQuery[NoteTagsTable]
}
