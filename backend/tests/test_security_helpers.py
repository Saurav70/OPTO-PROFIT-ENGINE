import unittest

from app.auth import hash_password as _hash_password, verify_password as _verify_password


class SecurityHelpersTest(unittest.TestCase):
    def test_hash_and_verify_password(self) -> None:
        password = "StrongPass123"
        stored_hash = _hash_password(password)
        self.assertTrue(_verify_password(password, stored_hash))
        self.assertFalse(_verify_password("WrongPass123", stored_hash))


if __name__ == "__main__":
    unittest.main()
