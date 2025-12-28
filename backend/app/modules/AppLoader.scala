package modules

import play.api.ApplicationLoader.Context
import play.api.inject.guice.{GuiceApplicationBuilder, GuiceApplicationLoader}

final class AppLoader extends GuiceApplicationLoader {
  override def builder(context: Context): GuiceApplicationBuilder =
    initialBuilder
      .in(context.environment)
      .loadConfig(context.initialConfiguration)
      .overrides(new NotesModule)
}
