// This hook will handle requests to /api/qr/:shortCode
// It will find the corresponding QR code, record a scan, and redirect the user.

routerAdd("GET", "/api/qr/:shortCode", (c) => {
    $app.logger().info("QR redirect hook triggered for path:", c.path);
    const shortCode = c.pathParam("shortCode");
    $app.logger().info("Short code extracted:", shortCode);
    const response = new Response(); // Create a new Response object

    try {
        // 1. Find the QR code record
        $app.logger().info("Searching for QR code with short_code:", shortCode);
        const qrCode = $app.dao().findFirstRecordByData("qr_codes", "short_code", shortCode);

        if (!qrCode) {
            $app.logger().warn("QR code not found for short code:", shortCode);
            // If QR code not found, redirect to a default page or show an error
            response.header("Location", "/"); // Redirect to homepage
            response.status = 302; // Found (temporary redirect)
            return response;
        }

        $app.logger().info("QR code found - ID:", qrCode.id, "URL:", qrCode.get("url"));

        // 2. Record the scan (analytics)
        const userAgent = c.request.header.get("User-Agent") || "Unknown";
        const ipAddress = c.request.remoteAddr || "Unknown";
        $app.logger().info("User-Agent:", userAgent);
        $app.logger().info("IP Address:", ipAddress);

        // Basic parsing of user agent for device and browser
        let device = "Unknown";
        let browser = "Unknown";

        if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
            device = "Mobile";
        } else if (userAgent.includes("Tablet")) {
            device = "Tablet";
        } else {
            device = "Desktop";
        }

        if (userAgent.includes("Chrome")) {
            browser = "Chrome";
        } else if (userAgent.includes("Firefox")) {
            browser = "Firefox";
        } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
            browser = "Safari";
        } else if (userAgent.includes("Edge")) {
            browser = "Edge";
        } else if (userAgent.includes("Opera")) {
            browser = "Opera";
        }

        $app.logger().info("Detected device:", device, "browser:", browser);

        // Note: Location from IP is complex and usually requires an external service.
        // For simplicity, we'll just log the IP or a generic "Unknown" for location.
        // You might integrate with a geo-IP API here if needed.
        const location = "Unknown (IP: " + ipAddress + ")"; // Placeholder

        const scanData = {
            qr_code: qrCode.id,
            timestamp: new Date().toISOString(),
            location: location,
            device: device,
            browser: browser,
        };

        $app.logger().info("Creating scan record with data:", JSON.stringify(scanData));

        try {
            $app.dao().createRecord(new Record($app.dao().findCollectionByNameOrId("scans")), scanData);
            $app.logger().info("Scan record created successfully for QR code:", qrCode.id);
        } catch (scanError) {
            $app.logger().error("Failed to create scan record:", scanError);
            // Continue with redirect even if scan logging fails
        }

        // 3. Redirect to the destination URL
        const destinationUrl = qrCode.get("url");
        if (destinationUrl) {
            $app.logger().info("Redirecting to destination URL:", destinationUrl);
            response.header("Location", destinationUrl);
            response.status = 302; // Found (temporary redirect)
        } else {
            $app.logger().warn("Destination URL missing for QR code:", qrCode.id);
            // Fallback if destination URL is missing
            response.header("Location", "/");
            response.status = 302;
        }

        return response;

    } catch (e) {
        $app.logger().error("Error in QR redirect hook", "error", e);
        $app.logger().error("Error details:", e.toString());
        // In case of an error, redirect to a generic error page or homepage
        response.header("Location", "/");
        response.status = 302;
        return response;
    }
}, "/*"); // The "/*" at the end ensures the hook is registered globally.

$app.logger().info("QR redirect hook registered successfully");
