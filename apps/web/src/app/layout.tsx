import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./global.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/PwaRegister";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export const viewport: Viewport = {
	themeColor: "#080f1e",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
};

export const metadata: Metadata = {
	title: "Reel Taste",
	description: "Personalized movie discovery app",
	manifest: "/manifest.webmanifest",
	icons: {
		icon: "/favicon.png",
		apple: "/icon-192.png",
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Reel Taste",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<link
					rel="stylesheet"
					href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
				/>
			</head>
			<body>
				<Providers>
					{children}
				</Providers>
				<PwaRegister />
				<PwaInstallPrompt />
			</body>
		</html>
	);
}
