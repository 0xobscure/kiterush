import Foundation
import Capacitor
import GameKit

/// Minimal Game Center bridge. JS name matches what the game calls:
///   Capacitor.Plugins.CapacitorGameConnect.signIn()
///   .submitScore({ leaderboardID, totalScoreAmount })
///   .showLeaderboard({ leaderboardID })
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameCenterPlugin"
    public let jsName = "CapacitorGameConnect"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAuthenticated", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise)
    ]

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                call.resolve(["authenticated": true, "player_name": player.displayName])
                return
            }
            var settled = false
            player.authenticateHandler = { [weak self] viewController, error in
                if let vc = viewController {
                    self?.bridge?.viewController?.present(vc, animated: true)
                    return
                }
                if settled { return }
                settled = true
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["authenticated": player.isAuthenticated, "player_name": player.displayName])
                }
            }
        }
    }

    @objc func isAuthenticated(_ call: CAPPluginCall) {
        call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated])
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardID = call.getString("leaderboardID"), !leaderboardID.isEmpty else {
            call.reject("leaderboardID is required"); return
        }
        let score = call.getInt("totalScoreAmount") ?? Int(call.getDouble("totalScoreAmount") ?? 0)
        guard GKLocalPlayer.local.isAuthenticated else { call.reject("Player not signed in to Game Center"); return }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardID]) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        let leaderboardID = call.getString("leaderboardID")
        DispatchQueue.main.async {
            let vc: GKGameCenterViewController
            if let id = leaderboardID, !id.isEmpty {
                vc = GKGameCenterViewController(leaderboardID: id, playerScope: .global, timeScope: .allTime)
            } else {
                vc = GKGameCenterViewController(state: .leaderboards)
            }
            vc.gameCenterDelegate = self
            self.bridge?.viewController?.present(vc, animated: true)
            call.resolve()
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
