"""Check that the persistent worker cannot flood Supabase after HTTP 402."""
import io
import unittest
import urllib.error
from unittest.mock import patch
import worker_daemon as worker


class QuotaProtection(unittest.TestCase):
    def setUp(self):
        self.previous_secret = worker.WORKER_SECRET
        worker.WORKER_SECRET = 'test-' * 10
        with worker.RATE_LOCK:
            worker.RATE_PAUSE_UNTIL = 0.0

    def tearDown(self):
        worker.WORKER_SECRET = self.previous_secret
        with worker.RATE_LOCK:
            worker.RATE_PAUSE_UNTIL = 0.0

    def test_http_402_triggers_cooldown_and_prevents_network_retry(self):
        error = urllib.error.HTTPError(
            'https://example.invalid', 402, 'quota restricted', {},
            io.BytesIO(b'{}')
        )
        with patch.object(worker.urllib.request, 'urlopen', side_effect=error) as open_url:
            with self.assertRaises(urllib.error.HTTPError):
                worker.call('claim')
            with self.assertRaisesRegex(RuntimeError, 'temporarily restricted'):
                worker.call('claim')
            self.assertEqual(open_url.call_count, 1)

    def test_quota_safe_minimum_intervals(self):
        self.assertGreaterEqual(worker.POLL_SECONDS, 20)
        self.assertGreaterEqual(worker.HEARTBEAT_SECONDS, 30)
        self.assertGreaterEqual(worker.MAX_IDLE_POLL_SECONDS, 60)


if __name__ == '__main__':
    unittest.main()
