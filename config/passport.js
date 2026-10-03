import passport from "passport";
import { User } from "../models/user.model.js";
import {
  Strategy as GoogleStrategy
} from "passport-google-oauth20";

passport.use(
  new GoogleStrategy(
    {
      clientID:
        process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        process.env.GOOGLE_CALLBACK_URL
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        const googleId =
          profile.id;

        const email =
          profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

        const name =
          profile.displayName?.trim();

        if (!email) {
          return done(
            new Error(
              "Google account email not available"
            ),
            null
          );
        }

        let user =
          await User.findOne({
            googleId
          });

        if (user) {
          if (user.isDeleted) {
            return done(
              null,
              user
            );
          }

          return done(
            null,
            user
          );
        }

        user =
          await User.findOne({
            email
          });

        if (user) {
          user.googleId =
            googleId;

          user.isGoogleUser =
            true;

          user.isVerified =
            true;

          await user.save();

          return done(
            null,
            user
          );
        }

        user =
          await User.create({
            name,
            email,
            googleId,
            isGoogleUser: true,
            isVerified: true
          });

        return done(
          null,
          user
        );
      } catch (error) {
        console.error(
          "Google Passport error:",
          error
        );

        return done(
          error,
          null
        );
      }
    }
  )
);