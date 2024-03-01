
export type SignUpBody = {
    username: string;
    password: string;
    email: string
  }

  export type ConfirmSignUpBody = {
    username: string;
    code: string;
  }

  export type SignInBody = {
    username: string;
    password: string;
  }