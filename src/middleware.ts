import { withAuth } from "next-auth/middleware";



export default withAuth({

  pages: {

    signIn: "/login",

  },

  callbacks: {

    authorized: ({ token, req }) => {

      const path = req.nextUrl.pathname;

      if (path.startsWith("/admin")) {

        return token?.role === "admin";

      }

      return !!token;

    },

  },

});



export const config = {

  matcher: ["/account", "/account/:path*", "/admin", "/admin/:path*"],

};

