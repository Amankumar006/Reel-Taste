const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const fs = require("node:fs");
const { FileStore } = require("metro-cache");


/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.maxWorkers = 6;

const WEB_ALIASES = {
	"expo-secure-store": path.resolve(
		__dirname,
		"./polyfills/web/secureStore.web.ts",
	),
	"react-native-webview": path.resolve(
		__dirname,
		"./polyfills/web/webview.web.tsx",
	),
	"react-native-safe-area-context": path.resolve(
		__dirname,
		"./polyfills/web/safeAreaContext.web.tsx",
	),
	"react-native-maps": path.resolve(__dirname, "./polyfills/web/maps.web.tsx"),
	"react-native-web/dist/exports/SafeAreaView": path.resolve(
		__dirname,
		"./polyfills/web/SafeAreaView.web.tsx",
	),
	"react-native-web/dist/exports/Alert": path.resolve(
		__dirname,
		"./polyfills/web/alerts.web.tsx",
	),
	"react-native-web/dist/exports/RefreshControl": path.resolve(
		__dirname,
		"./polyfills/web/refreshControl.web.tsx",
	),
	"expo-status-bar": path.resolve(
		__dirname,
		"./polyfills/web/statusBar.web.tsx",
	),
	"expo-location": path.resolve(__dirname, "./polyfills/web/location.web.ts"),
	"./layouts/Tabs": path.resolve(__dirname, "./polyfills/web/tabbar.web.tsx"),
	"expo-notifications": path.resolve(
		__dirname,
		"./polyfills/web/notifications.web.tsx",
	),
	"expo-contacts": path.resolve(__dirname, "./polyfills/web/contacts.web.ts"),
	"expo-font": path.resolve(__dirname, "./polyfills/web/expo-font.web.ts"),
	"react-native-google-mobile-ads": path.resolve(
		__dirname,
		"./polyfills/web/google-mobile-ads.web.tsx",
	),
	"react-native-web/dist/exports/ScrollView": path.resolve(
		__dirname,
		"./polyfills/web/scrollview.web.tsx",
	),
	"expo-haptics": path.resolve(__dirname, "./polyfills/web/haptics.web.ts"),
	"expo-clipboard": path.resolve(__dirname, "./polyfills/web/clipboard.web.ts"),
	"expo-camera": path.resolve(__dirname, "./polyfills/web/camera.web.tsx"),
	"expo-image-picker": path.resolve(
		__dirname,
		"./polyfills/web/imagePicker.web.ts",
	),
	"expo-linking": path.resolve(__dirname, "./polyfills/web/linking.web.ts"),
	"expo-web-browser": path.resolve(
		__dirname,
		"./polyfills/web/webBrowser.web.ts",
	),
	"expo-document-picker": path.resolve(
		__dirname,
		"./polyfills/web/documentPicker.web.ts",
	),
};
const NATIVE_ALIASES = {
	"./Libraries/Components/TextInput/TextInput": path.resolve(
		__dirname,
		"./polyfills/native/textinput.native.tsx",
	),
	"react-native-google-mobile-ads": path.resolve(
		__dirname,
		"./polyfills/native/google-mobile-ads.native.tsx",
	),
};
// Aliases that only apply outside production. The real packages crash on
// import in Expo Go preview (their browser-mode shims pull in DOM-only code
// that throws on Hermes), which makes expo-router silently swallow the load
// error and warn "Route is missing the required default export" — leaving
// the app on a black/splash screen. EAS production builds keep the real
// modules so paid users hit the native SDKs as normal.
const DEV_ONLY_NATIVE_ALIASES = {
	"react-native-purchases": path.resolve(
		__dirname,
		"./polyfills/native/react-native-purchases.native.tsx",
	),
};
const SHARED_ALIASES = {
	"expo-image": path.resolve(__dirname, "./polyfills/shared/expo-image.tsx"),
};


// Add web-specific alias configuration through resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
	// Polyfills are not resolved by Metro
	if (
		context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
		context.originModulePath.startsWith(`${__dirname}/polyfills/web`) ||
		context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
	) {
		return context.resolveRequest(context, moduleName, platform);
	}
	// Wildcard alias for Expo Google Fonts
	if (
		moduleName.startsWith("@expo-google-fonts/") &&
		moduleName !== "@expo-google-fonts/dev"
	) {
		return context.resolveRequest(
			context,
			"@expo-google-fonts/dev",
			platform,
		);
	}
	if (SHARED_ALIASES[moduleName] && !moduleName.startsWith("./polyfills/")) {
		return context.resolveRequest(
			context,
			SHARED_ALIASES[moduleName],
			platform,
		);
	}
	if (platform === "web") {
		// Only apply aliases if the module is one of our polyfills
		if (WEB_ALIASES[moduleName] && !moduleName.startsWith("./polyfills/")) {
			return context.resolveRequest(
				context,
				WEB_ALIASES[moduleName],
				platform,
			);
		}
		return context.resolveRequest(context, moduleName, platform);
	}

	if (NATIVE_ALIASES[moduleName] && !moduleName.startsWith("./polyfills/")) {
		return context.resolveRequest(
			context,
			NATIVE_ALIASES[moduleName],
			platform,
		);
	}
	if (
		DEV_ONLY_NATIVE_ALIASES[moduleName] &&
		!moduleName.startsWith("./polyfills/") &&
		process.env.EXPO_PUBLIC_CREATE_ENV !== "PRODUCTION"
	) {
		return context.resolveRequest(
			context,
			DEV_ONLY_NATIVE_ALIASES[moduleName],
			platform,
		);
	}
	return context.resolveRequest(context, moduleName, platform);
};

const cacheDir = path.join(__dirname, "caches");
// Ensure caches dir exists (it's gitignored so absent on fresh clone / after cache wipe)
fs.mkdirSync(cacheDir, { recursive: true });

config.cacheStores = () => [
	new FileStore({
		root: path.join(cacheDir, ".metro-cache"),
	}),
];
config.resetCache = false;
config.fileMapCacheDirectory = cacheDir;


const originalGetTransformOptions = config.transformer.getTransformOptions;

config.transformer = {
	...config.transformer,
	getTransformOptions: async (entryPoints, options) => {
		if (options.dev === false) {
			fs.rmSync(cacheDir, { recursive: true, force: true });
			fs.mkdirSync(cacheDir);
		}
		return await originalGetTransformOptions(entryPoints, options);
	},
};

const https = require("node:https");

config.server = {
	...config.server,
	enhanceMiddleware: (middleware, metroServer) => {
		return (req, res, next) => {
			if (req.url.startsWith("/_proxy/")) {
				const targetUrl = "https://reel-taste-web.vercel.app" + req.url.slice(7);
				console.log(`METRO_PROXY: Proxying ${req.url} to ${targetUrl}`);

				const urlObj = new URL(targetUrl);
				const options = {
					hostname: urlObj.hostname,
					port: 443,
					path: urlObj.pathname + urlObj.search,
					method: req.method,
					headers: {
						...req.headers,
						host: urlObj.hostname,
					},
					rejectUnauthorized: false,
				};

				const proxyReq = https.request(options, (proxyRes) => {
					res.writeHead(proxyRes.statusCode, proxyRes.headers);
					proxyRes.pipe(res, { end: true });
				});

				proxyReq.on("error", (err) => {
					console.error("METRO_PROXY: Proxy error", err);
					res.writeHead(500, { "Content-Type": "text/plain" });
					res.end(`Proxy error: ${err.message}`);
				});

				if (req.method === "GET" || req.method === "HEAD") {
					proxyReq.end();
				} else {
					req.pipe(proxyReq, { end: true });
				}
				return;
			}
			return middleware(req, res, next);
		};
	},
};

module.exports = config;
