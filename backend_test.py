import requests
import sys
import random
import string
from datetime import datetime

class SixExAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.email = f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        self.password = "TestPassword123!"

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail provided')
                    print(f"Error: {error_detail}")
                except:
                    print("Could not parse error response")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={"email": self.email, "password": self.password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": self.email, "password": self.password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_stocks(self):
        """Test getting all stocks"""
        success, response = self.run_test(
            "Get All Stocks",
            "GET",
            "api/stocks",
            200
        )
        if success and 'stocks' in response:
            print(f"Found {len(response['stocks'])} stocks")
            return True
        return False

    def test_get_stock_detail(self, symbol="NFLX"):
        """Test getting stock details"""
        success, response = self.run_test(
            f"Get Stock Detail ({symbol})",
            "GET",
            f"api/stocks/{symbol}",
            200
        )
        if success and 'symbol' in response:
            print(f"Stock details: {response['name']} - ${response['price']}")
            return True
        return False

    def test_get_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "api/user/profile",
            200,
            auth=True
        )
        if success and 'id' in response:
            print(f"User profile retrieved for: {response['email']}")
            return True
        return False

    def test_buy_stock(self, symbol="NFLX", amount=10.0):
        """Test buying a stock"""
        success, response = self.run_test(
            f"Buy Stock ({symbol})",
            "POST",
            "api/investments/buy",
            200,
            data={"stock_symbol": symbol, "amount": amount},
            auth=True
        )
        if success and 'message' in response:
            print(f"Investment result: {response['message']}")
            print(f"Shares purchased: {response['shares_purchased']}")
            return True
        return False

    def test_get_investments(self):
        """Test getting user investments"""
        success, response = self.run_test(
            "Get User Investments",
            "GET",
            "api/investments",
            200,
            auth=True
        )
        if success and 'investments' in response:
            print(f"Found {len(response['investments'])} investments")
            return True
        return False

    def test_get_portfolio_summary(self):
        """Test getting portfolio summary"""
        success, response = self.run_test(
            "Get Portfolio Summary",
            "GET",
            "api/portfolio/summary",
            200,
            auth=True
        )
        if success:
            print(f"Portfolio value: ${response.get('total_current_value', 0)}")
            return True
        return False

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://985a05ff-9d22-4d3c-ac0c-2812362c1007.preview.emergentagent.com"
    
    print(f"🚀 Starting 6ex API tests with backend URL: {backend_url}")
    
    # Setup tester
    tester = SixExAPITester(backend_url)
    
    # Run tests
    print("\n==== Basic API Tests ====")
    tester.test_health_check()
    
    print("\n==== Authentication Tests ====")
    if not tester.test_register():
        print("❌ Registration failed, trying login with existing user...")
        if not tester.test_login():
            print("❌ Login failed, stopping tests")
            return 1
    
    print("\n==== Stock Data Tests ====")
    tester.test_get_stocks()
    tester.test_get_stock_detail("NFLX")
    tester.test_get_stock_detail("GOOGL")
    
    print("\n==== User Profile Tests ====")
    tester.test_get_profile()
    
    print("\n==== Investment Tests ====")
    tester.test_buy_stock("NFLX", 10.0)
    tester.test_buy_stock("GOOGL", 5.0)
    tester.test_get_investments()
    tester.test_get_portfolio_summary()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
