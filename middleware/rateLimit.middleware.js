const requests = new Map();

const limit = 5;
const windowMs = 1000 * 60;

const rateLimit = (req, res, next) => {
    const IP = req.ip;

    const currentTime = Date.now();

    if (!requests.has(IP)) {
        requests.set(IP, {
            count: 1,
            startTime: currentTime
        });
    } else {
        const existingIp = requests.get(IP);

        const elapsedTime = currentTime - existingIp.startTime;

        if (elapsedTime >= windowMs) {
            existingIp.count = 1;
            existingIp.startTime = currentTime;
        } else {
            if (existingIp.count >= limit) {
                const remaining = windowMs - elapsedTime;
                const remainingSeconds = Math.ceil(remaining / 1000);

                return res
                    .status(429)
                    .set("Retry-After", remainingSeconds)
                    .json({
                        success: false,
                        message: "Too many requests. Please try again later."
                    });
            }

            existingIp.count += 1;
        }
    }

    next();
};

export default rateLimit;