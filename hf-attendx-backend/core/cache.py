

class InMemoryCache:
    def __init__(self):
        self.attendance = {"data": None, "timestamp": 0, "ttl": 300}
        self.today = {"data": None, "timestamp": 0, "ttl": 60}
        self.logs = {"data": {}, "timestamp": {}, "ttl": 60}

    def invalidate_all(self):
        self.attendance["data"] = None
        self.attendance["timestamp"] = 0
        self.today["data"] = None
        self.today["timestamp"] = 0
        self.logs["data"] = {}
        self.logs["timestamp"] = {}

cache = InMemoryCache()
