package controllers

import javax.inject.*
import play.api.mvc.*

@Singleton
final class HealthController @Inject() (cc: ControllerComponents) extends AbstractController(cc) {
  def ping: Action[AnyContent] = Action {
    Ok("ok")
  }
}
