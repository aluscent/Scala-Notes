package repo

import javax.inject.{Inject, Singleton}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import db.Tables

@Singleton
final class DbSupport @Inject() (val dbConfig: DatabaseConfig[JdbcProfile]) {
  val profile: JdbcProfile = dbConfig.profile
  val db = dbConfig.db
  val tables = new Tables(profile)
}
