import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

//redux toolkit query instead of fetch/axios
//define a service user a base URL
const appApi = createApi({
  //defining base api url
  reducerPath: "appApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5001",
  }),

  //creating endpoints
  endpoints: (builder) => ({
    //mutation is used for modifying in the database
    //creating the user
    signupUser: builder.mutation({
      query: (user) => ({
        url: "/users",
        method: "POST",
        body: user,
      }),
    }),

    //logging in user
    //method is POST because we are creating a new instance of user in the backend instead of just GETing it check backend logic
    loginUser: builder.mutation({
      query: (user) => ({
        url: "/users/login",
        method: "POST",
        body: user,
      }),
    }),

    //logout user
    logoutUser: builder.mutation({
      query: (payload) => ({
        url: "/logout",
        method: "DELETE",
        body: payload,
      }),
    }),
  }),
});

//creates these actions into hooks
export const {
  useSignupUserMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
} = appApi;

export default appApi;
