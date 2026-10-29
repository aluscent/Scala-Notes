package repo

import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.*

class NotesRepositorySpec extends AnyFunSuite with BeforeAndAfterAll {
  given ExecutionContext = ExecutionContext.global
  private val config = DatabaseConfig.forConfig[JdbcProfile]("testdb", ConfigFactory.parseString("""
    testdb {
      profile = "slick.jdbc.H2Profile$"
      db { driver = "org.h2.Driver", url = "jdbc:h2:mem:notes-tests;DB_CLOSE_DELAY=-1", connectionPool = disabled, keepAliveConnection = true }
    }
  """))
  private val support = new DbSupport(config)
  import support.profile.api.*
  private val tables = support.tables
  private val repository = new NotesRepository(support)
  private def waitFor[A](future: Future[A]): A = Await.result(future, 15.seconds)
  override def beforeAll(): Unit = {
    waitFor(support.db.run((tables.categories.schema ++ tables.tags.schema ++ tables.notes.schema ++
      tables.noteCategories.schema ++ tables.noteTags.schema).create))
  }
  override def afterAll(): Unit = config.db.close()

  test("search covers title and content, ignores case, and treats SQL wildcards literally") {
    val note = waitFor(repository.create("Spark guide", "Use 50% of_data! capacity", Seq.empty, Seq.empty))
    for (q <- Seq("SPARK", "50%", "of_data!")) {
      assert(waitFor(repository.list(Some(q), None, None)).exists(_.id == note.id))
    }
    assert(waitFor(repository.list(Some("missing_needle"), None, None)).isEmpty)
    assert(waitFor(repository.list(Some("   "), None, None)).nonEmpty)
  }
  test("pagination is bounded, stable for equal timestamps, and does not overlap") {
    val ids = (1 to 5).map(i => waitFor(repository.create(s"page-$i", "paging", Seq.empty, Seq.empty)).id)
    waitFor(support.db.run(tables.notes.filter(_.id inSet ids).map(_.updatedAt)
      .update(java.time.Instant.parse("2025-01-01T00:00:00Z"))))
    val first = waitFor(repository.list(Some("paging"), None, None, 2, 0))
    val next = waitFor(repository.list(Some("paging"), None, None, 2, 2))
    assert(first.size == 2 && next.size == 2)
    assert(first.map(_.id).toSet.intersect(next.map(_.id).toSet).isEmpty)
    assert(first.map(_.id) == ids.reverse.take(2))
    intercept[IllegalArgumentException](repository.list(None, None, None, 101, 0))
  }
  test("relationship updates are normalized and roll back the note when an FK fails") {
    val cid = waitFor(support.db.run((tables.categories returning tables.categories.map(_.id)) += tables.CategoryRow(name = "Data")))
    val tid = waitFor(support.db.run((tables.tags returning tables.tags.map(_.id)) += tables.TagRow(name = "Spark")))
    val note = waitFor(repository.create("Original", "body", Seq(cid, cid), Seq(tid, tid)))
    assert(note.categories.map(_.id) == Seq(cid))
    assert(note.tags.map(_.id) == Seq(tid))
    intercept[Exception] { waitFor(repository.update(note.id, "Bad update", "changed", Seq(cid), Seq(-999L))) }
    val unchanged = waitFor(repository.get(note.id)).get
    assert(unchanged.title == "Original" && unchanged.tags.map(_.id) == Seq(tid))
    val updated = waitFor(repository.update(note.id, "Updated", "new", Seq.empty, Seq.empty)).get
    assert(updated.categories.isEmpty && updated.tags.isEmpty)
    assert(waitFor(repository.delete(note.id)))
    assert(waitFor(repository.get(note.id)).isEmpty)
  }
}
