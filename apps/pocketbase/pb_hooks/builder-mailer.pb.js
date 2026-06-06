/// <reference path="../pb_data/types.d.ts" />

onMailerSend((e) => {
    if (e.app.settings().smtp.enabled) {
        return e.next();
    }

    const smtpHost = String($os.getenv("SMTP_HOST") || "").trim();
    const smtpPort = Number(String($os.getenv("SMTP_PORT") || "").trim() || 0);
    const smtpUser = String($os.getenv("SMTP_USER") || "").trim();
    const smtpPass = String($os.getenv("SMTP_PASS") || "").trim();

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
        const smtpTlsRaw = String($os.getenv("SMTP_TLS") || "").trim().toLowerCase();
        const smtpTls = smtpTlsRaw
            ? ["1", "true", "yes", "on"].includes(smtpTlsRaw)
            : smtpPort === 465;

        const settings = e.app.settings();
        settings.smtp.enabled = true;
        settings.smtp.host = smtpHost;
        settings.smtp.port = smtpPort;
        settings.smtp.username = smtpUser;
        settings.smtp.password = smtpPass;
        settings.smtp.authMethod = String($os.getenv("SMTP_AUTH_METHOD") || "").trim() || "PLAIN";
        settings.smtp.tls = smtpTls;
        settings.meta.appName = String($os.getenv("PB_APP_NAME") || "").trim() || settings.meta.appName || "Zahniboerse";
        settings.meta.appURL = String($os.getenv("FRONTEND_URL") || "").trim() || settings.meta.appURL || "https://zahniboerse.com";
        settings.meta.senderName = String($os.getenv("SMTP_FROM_NAME") || "").trim() || settings.meta.senderName || settings.meta.appName;
        settings.meta.senderAddress = String($os.getenv("SMTP_FROM") || "").trim() || settings.meta.senderAddress || smtpUser;

        e.app.save(settings);
        e.app.logger().info("PocketBase SMTP configured from environment", "host", smtpHost, "port", smtpPort);
        return e.next();
    }

    const apiUrl = String($os.getenv("BUILDER_MAILER_API_URL") || "").trim();
    const apiKey = String($os.getenv("BUILDER_MAILER_API_KEY") || "").trim();
    const senderAddress = String($os.getenv("BUILDER_MAILER_SENDER_ADDRESS") || "").trim();

    if (!apiUrl || !apiKey || !senderAddress) {
        e.app.logger().error("No email delivery provider configured. Set SMTP_* env vars or BUILDER_MAILER_* env vars.");
        throw new ApiError(500, "Email delivery is not configured");
    }

    const payload = {
        subject: e.message.subject,
        content: {
            ...(e.message.html ? { html: e.message.html } : { text: e.message.text }),
            type: "plain",
        },
        from: senderAddress,
        replyTo: senderAddress,
        to: e.message.to[0].address,
    };

    const response = $http.send({
        url: `${apiUrl}/api/v2/email`,
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (response.statusCode !== 200) {
        e.app.logger().error("Failed to send email", "status", response.statusCode, "error", response.json);
        throw new ApiError(500, response.json?.message || "Failed to send email");
    }
});
