import unittest
from unittest.mock import patch
import worker

class WorkerPool(unittest.TestCase):
    def test_claims_two_jobs_before_processing(self):
        claims=iter([
            {'job':{'id':'job-1'}},
            {'job':{'id':'job-2'}},
            {'job':None},
        ])
        with patch.object(worker,'call',side_effect=lambda action,*a,**k: next(claims)), \
             patch.object(worker,'process',return_value=0) as process:
            worker.main()
        self.assertEqual(process.call_count,2)
        self.assertEqual({c.args[0]['job']['id'] for c in process.call_args_list},{'job-1','job-2'})

if __name__=='__main__':
    unittest.main()
