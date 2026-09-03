import e, { Router } from "express";
import { adduser, isUser, isvalid, isValidOtp } from "./validation/validate.js";

const Routes = e.Router();

//POST
Routes.post("/register", async (req, res) => {
    const { name, mail, MNo, pass } = req.body || {};

    if (!(isvalid(name) && isvalid(mail) && isvalid(pass) && isvalid(MNo))) {
        return res.status(406).json({ error: "Invalid fields" });
    }

    try {
        const user = await adduser({ name, mail, MNo, pass });
        // responds in ~1s instead of never
        return res.status(200).json({ msg: "OTP sent", user });
    } catch (err) {
        console.error("register failed:", err?.message);
        return res.status(err.status || 502).json({ error: err?.message || "Could not send OTP" });
    }
});

Routes.post("/auth", (req, res) => {
    const { mail, otp } = req.body || {};

    if (!(isvalid(mail) && isvalid(otp))) {
        return res.status(406).json({ error: "Mail and OTP are required" });
    }

    const result = isValidOtp({ mail, otp });
    if (!result.ok) {
        return res.status(401).json({ error: result.reason });
    }

    const { pass, otp: _o, otpExpiresAt, ...safe } = result.user;
    return res.status(200).json({ msg: "Account verified, you may log in now", user: safe });
});

Routes.post("/login", (req, res) => {
    const { mail, pass } = req.body || {};

    if (!(isvalid(mail) && isvalid(pass))) {
        return res.status(406).json({ error: "Mail and password are required" });
    }

    const user = isUser({ mail, pass });
    if (user === false) return res.status(401).json({ error: "Unauthorised user" });
    if (user === "unverified") return res.status(403).json({ error: "Verify your email first" });
    if(user.error) return res.status(500).json({error : user.error})

    const { pass: _p, otp: _o, otpExpiresAt, ...safe } = user;
    return res.status(200).json({ msg: "user logged in", user: safe });
});


export default Routes;
