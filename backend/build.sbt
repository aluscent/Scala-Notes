ThisBuild / organization := "com.example"
ThisBuild / scalaVersion := "3.3.4"

assembly / assemblyJarName := "notes-backend.jar"
val jacksonV = "2.14.3"

lazy val root = (project in file("."))
  .enablePlugins(PlayScala)
  .settings(
    name := "notes-backend",
    dependencyOverrides ++= Seq(
      "com.fasterxml.jackson.core"   %  "jackson-databind"    % jacksonV,
      "com.fasterxml.jackson.core"   %  "jackson-core"        % jacksonV,
      "com.fasterxml.jackson.core"   %  "jackson-annotations" % jacksonV,
      "com.fasterxml.jackson.module" %% "jackson-module-scala" % jacksonV
    ),
    libraryDependencies ++= Seq(
      guice,
      "com.typesafe.slick" %% "slick" % "3.6.1",
      "com.typesafe.slick" %% "slick-hikaricp" % "3.6.1",
      "com.h2database" % "h2" % "2.4.240",
      "org.flywaydb" % "flyway-core" % "11.20.0"
    ),
    // Make JSON a first-class citizen in tests too.
    Test / javaOptions += "-Dconfig.resource=application.conf"
  )
