import crypto from "crypto";
import { generate } from "otp-generator";
import { Users } from "../Storage.js";
import { Resend } from "resend";
import jwt from 'jsonwebtoken';

const OTP_TTL_MS = 5 * 60 * 1000;   // OTP is valid for 5 minutes

/* ---------------------------------------------------------------------------
 * REMOVED: pause() / wait() / the module-level `idx`.
 *
 * The old adduser() ended with `await wait(id)`, which polled every 10s until
 * ANOTHER request (POST /user/auth) happened to set the shared `idx`. That means
 * POST /user/register deliberately never sent a response. The socket just sat
 * open. On localhost an open socket can sit there all day; over Wi-Fi it gets
 * torn down and axios reports "Network Error".
 *
 * Register now: create user -> send mail -> respond. Verification is its own
 * request, as it should be.
 * ------------------------------------------------------------------------- */

export const isvalid = (field) => {
    if (field !== undefined && field !== null && String(field).trim() !== "") {
        return true;
    }
    return false;
}

export const isValidOtp = ({ mail, otp }) => {
    const wanted = String(otp).trim();
    const user = Users.find(
        (u) => u.mail === mail && String(u.otp) === wanted && u.valid === false
    );

    if (!user) return { ok: false, reason: "Incorrect mail or OTP" };
    if (Date.now() > user.otpExpiresAt) return { ok: false, reason: "OTP expired, please register again" };

    user.valid = true;
    console.log("verified:", user.mail);
    return { ok: true, user };
}

export const adduser = async (user) => {
    const existing = Users.find((u) => u.mail === user.mail);
    if (existing && existing.valid) {
        throw Object.assign(new Error("An account with this email already exists"), { status: 409 });
    }
    // re-registering an unverified email replaces the old pending record
    if (existing) Users.splice(Users.indexOf(existing), 1);

    const OTP = generate(6, { digits: true, upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    const usr = { ID: crypto.randomUUID(), ...user, otp: OTP, valid: false, otpExpiresAt: Date.now() + OTP_TTL_MS };
    Users.push(usr);

    console.log("OTP for", usr.mail, "=", OTP);   // dev fallback if mail is down
    await mail({ mail: user.mail, otp: OTP });
    console.log("OTP mail delivered to", usr.mail);

    return { ID: usr.ID, mail: usr.mail, name: usr.name };
}

export const isUser = ({ mail, pass }) => {
    const user = Users.find((u) => u.mail === mail && u.pass === pass);
    if (!user) return false;
    if (!user.valid) return "unverified";
    try{
        const token = jwt.sign({ mail }, process.env.JWT_SECRET_KEY, { expiresIn:"7D", algorithm: "HS256" });
        return {...user, token: token};
    }catch(err){
        return {error:err}
    }
}

const mail = async ({ mail, otp }) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY missing from environment");
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: mail,
        subject: 'Registration OTP',
        text: `Your registration OTP is: ${otp}\n\nValid for 5 minutes.`
    });
    if (error) throw new Error(error.message);
};
