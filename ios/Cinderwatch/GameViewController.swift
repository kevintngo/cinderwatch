import UIKit
import WebKit

/// Runs the single-file web build of Cinderwatch full screen in a WKWebView.
///
/// The page is served from the app bundle on cinderwatch://app/, a fixed origin, so
/// localStorage keeps the best wave and the mute setting, with no network access.
/// What Safari would do for the page on a phone, the app does natively: hide the status
/// bar and home indicator, keep the game clear of the notch, keep the screen on (see
/// SceneDelegate), and turn the page's vibration taps into haptics.
final class GameViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler, UIScrollViewDelegate {
    static let night = UIColor(red: 2 / 255, green: 3 / 255, blue: 8 / 255, alpha: 1)
    static let scheme = "cinderwatch"

    /// iOS has no navigator.vibrate; route the game's short taps to the haptic engine.
    /// Also stop long presses from selecting text or opening a callout.
    private static let bridgeJS = """
    (function () {
      navigator.vibrate = function (p) {
        try { window.webkit.messageHandlers.buzz.postMessage(Array.isArray(p) ? p.length : 1); } catch (e) {}
        return true;
      };
      document.addEventListener('DOMContentLoaded', function () {
        var s = document.documentElement.style; s.webkitTouchCallout = 'none'; s.webkitUserSelect = 'none';
      });
    })();
    """

    private var web: WKWebView!
    private let haptics = UIImpactFeedbackGenerator(style: .light)

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: Self.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.userContentController.add(WeakMessageHandler(self), name: "buzz")
        config.userContentController.addUserScript(WKUserScript(source: Self.bridgeJS, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = Self.night
        web.scrollView.backgroundColor = Self.night
        // The page lays itself out around the safe area (viewport-fit=cover), so the
        // web view covers the whole screen and passes the insets through to CSS.
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.delegate = self
        web.allowsLinkPreview = false
        web.navigationDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        var start = Self.scheme + "://app/index.html"
        #if DEBUG
        start += "#fps=1" // debug builds show the game's frame rate counter
        #endif
        if let url = URL(string: start) { web.load(URLRequest(url: url)) }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // A swipe at the edge goes to the game first; a second swipe reaches the system.
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }

    // No pinch zoom of the page itself; the game zooms its own camera.
    func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "buzz" else { return }
        haptics.impactOccurred(intensity: (message.body as? Int ?? 1) > 1 ? 1 : 0.6)
    }

    // Any outside link opens in Safari instead of replacing the game.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.scheme != Self.scheme, url.scheme != "about" else { decisionHandler(.allow); return }
        if url.scheme == "http" || url.scheme == "https" { UIApplication.shared.open(url) }
        decisionHandler(.cancel)
    }

    // If iOS reclaims the web content process while in the background, start again.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
}

/// Serves index.html from the app bundle.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url,
              url.path == "/" || url.path == "/index.html",
              let file = Bundle.main.url(forResource: "index", withExtension: "html"),
              let data = try? Data(contentsOf: file),
              let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                             headerFields: ["Content-Type": "text/html; charset=utf-8", "Content-Length": String(data.count)])
        else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

/// WKUserContentController keeps its handlers alive; this avoids a retain cycle.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
