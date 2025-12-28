package controllers

import javax.inject.*
import play.api.Environment
import play.api.mvc.*

import scala.concurrent.ExecutionContext

@Singleton
final class SpaController @Inject() (
  cc: ControllerComponents,
  env: Environment
)(using ec: ExecutionContext) extends AbstractController(cc) {

  def index(path: String): Action[AnyContent] = Action {
    env.resourceAsStream("public/index.html") match {
      case None =>
        Ok("Frontend not built. Run the React dev server in ./frontend or build and copy dist to backend/public.")
          .as("text/plain")
      case Some(stream) =>
        val bytes = stream.readAllBytes()
        Ok(bytes).as(HTML)
    }
  }
}
