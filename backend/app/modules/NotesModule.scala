package modules

import com.google.inject.{AbstractModule, Provides}
import javax.inject.{Inject, Singleton}
import play.api.{Configuration, Environment}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import org.flywaydb.core.Flyway

import java.nio.file.{Files, Paths}
import scala.concurrent.ExecutionContext
import repo.DbSupport

final class NotesModule extends AbstractModule {

  override def configure(): Unit = {
    // Eagerly run migrations on app startup.
    bind(classOf[FlywayMigrator]).asEagerSingleton()
    // Warm up the database connection so the first request is fast.
    bind(classOf[DatabaseWarmup]).asEagerSingleton()
  }

  @Provides
  @Singleton
  def dbConfig(configuration: Configuration): DatabaseConfig[JdbcProfile] =
    DatabaseConfig.forConfig[JdbcProfile]("db.default", configuration.underlying)

}

@Singleton
final class FlywayMigrator @Inject() (configuration: Configuration) {
  private val db = configuration.get[Configuration]("db.default.db")

  private val url = db.get[String]("url")
  private val user = db.get[String]("user")
  private val password = db.getOptional[String]("password").getOrElse("")

  // Ensure ./data exists when using jdbc:h2:file:./data/...
  Files.createDirectories(Paths.get("./data"))

  Flyway
    .configure()
    .dataSource(url, user, password)
    .locations("classpath:db/migration")
    .baselineOnMigrate(true)
    .load()
    .migrate()
}

@Singleton
final class DatabaseWarmup @Inject() (dbs: DbSupport)(using ec: ExecutionContext) {
  import dbs.profile.api.*

  private val warmup = dbs.db.run(sql"select 1".as[Int].headOption).map(_ => ())(using ec)
  warmup.failed.foreach(_ => ())(using ec)
}
