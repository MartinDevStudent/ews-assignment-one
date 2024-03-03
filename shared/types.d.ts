export type SignUpBody = {
  username: string;
  password: string;
  email: string;
};

export type ConfirmSignUpBody = {
  username: string;
  code: string;
};

export type SignInBody = {
  username: string;
  password: string;
};

export type MovieReview = {
  movieId: Number;
  reviewerName: string;
  reviewDate: string;
  content: string;
  rating: Number;
};

export type MovieReviewsQueryParams = {
  minRating?: number;
};

export type TranslationQueryParams = {
  language: string;
};
