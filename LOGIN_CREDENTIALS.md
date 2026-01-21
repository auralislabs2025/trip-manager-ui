# Login Credentials

## Default User Accounts

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin
- **Access:** Full access to all features

### Staff Account
- **Username:** `staff`
- **Password:** `staff123`
- **Role:** Staff
- **Access:** Can create trips, add expenses, view reports (cannot delete trips or edit closed trips)

---

## How to Login

1. Open the login page (`index.html`)
2. Enter one of the usernames above
3. Enter the corresponding password
4. Select the appropriate role (Admin or Staff)
5. Click "Sign In"

---

## ⚠️ Security Note

**These are default credentials for development/demo purposes only.**

For production use:
- Change all default passwords
- Implement proper password hashing (bcrypt, Argon2, etc.)
- Add password strength requirements
- Implement password reset functionality
- Consider adding two-factor authentication

---

## Changing Passwords

To change passwords, you can:
1. Edit the `js/storage.js` file
2. Find the `initializeStorage()` function
3. Update the password hash using the `hashPassword()` function
4. Clear browser LocalStorage to reset to new defaults

Or programmatically:
```javascript
// In browser console
const newPassword = storage.hashPassword('your_new_password');
// Then update the user object in LocalStorage
```




