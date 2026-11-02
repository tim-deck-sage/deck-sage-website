// Fixed messages only: never reflect server details or disclose account existence.
export const signupNotice='If this email can be registered, check your inbox and spam folder for a verification link. Open it in this browser, then finish choosing your username and ZIP. If you already have an account, sign in with your email and existing password.';
export const signupUnknown='We could not confirm whether your signup completed. Check your email before trying again. You can return to sign in; refresh this page before another signup attempt.';
export function signupErrors({username,password,confirmation,email,zip,terms,privacy,captcha}){
 const errors={};
 if(!/^[A-Za-z0-9_]{3,24}$/.test(username.trim()))errors.username='Use 3–24 letters, numbers or underscores.';
 if(password.length<12||password.length>256)errors.password='Use a password with 12–256 characters.';
 if(!confirmation||confirmation!==password)errors.confirmation='Enter the same password again.';
 if(email.trim().length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim()))errors.email='Enter a valid email address, such as name@example.com.';
 if(!/^[0-9]{5}$/.test(zip))errors.zip='Enter your 5-digit US ZIP code, including any leading zeros.';
 if(!terms)errors.terms='Agree to the Terms of Use to continue.';
 if(!privacy)errors.privacy='Acknowledge the Privacy Policy to continue.';
 if(!captcha)errors.captcha='Complete the security verification below. If it is unavailable, select Retry verification.';
 return errors;
}
export function signupFailure(error){
 switch(error?.code){
  case 'email_exists':case 'user_already_exists':return {notice:true};
  case 'weak_password':return {field:'password',message:'Choose a stronger password with at least 12 characters. Avoid common or compromised passwords.'};
  case 'email_address_invalid':return {field:'email',message:'This email address cannot be used. Check its spelling and use a valid personal email address.'};
  case 'captcha_failed':return {field:'captcha',message:'Security verification failed or expired. Complete the new verification and try again.'};
  case 'over_email_send_rate_limit':case 'over_request_rate_limit':return {message:'Too many requests. Wait a few minutes, check your email, then try again.'};
  case 'signup_disabled':case 'email_provider_disabled':return {message:'New account signup is temporarily unavailable. Please try again later.'};
  case 'email_address_not_authorized':return {message:'Verification email delivery is unavailable. Please contact Deck Sage support; changing your password will not fix this.'};
  default:return {message:signupUnknown,unknown:true};
 }
}
