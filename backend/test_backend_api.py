"""
Backend API Test Script
======================

This script tests all the backend API endpoints to ensure they're working correctly.

Usage:
    python test_backend_api.py
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
HEADERS = {"Content-Type": "application/json"}


def print_section(title):
    """Print a section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def test_endpoint(name, method, url, data=None, expected_status=200):
    """Test a single endpoint."""
    print(f"\n📍 Testing: {name}")
    print(f"   Method: {method}")
    print(f"   URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            print(f"   Data: {json.dumps(data, indent=2)}")
            response = requests.post(url, json=data, headers=HEADERS, timeout=10)
        else:
            print(f"   ❌ Unsupported method: {method}")
            return False
        
        print(f"   Status: {response.status_code} (Expected: {expected_status})")
        
        if response.status_code == expected_status:
            print("   ✅ Success!")
            response_data = response.json()
            print(f"   Response preview:")
            print(json.dumps(response_data, indent=2)[:500] + "...")
            return True
        else:
            print(f"   ❌ Failed! Got status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "🚀" * 40)
    print("Backend API Test Suite")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🚀" * 40)
    
    results = []
    
    # Test 1: API Root
    print_section("Test 1: API Root")
    results.append(test_endpoint(
        "API Root",
        "GET",
        f"{BASE_URL}/"
    ))
    
    # Test 2: Health Check
    print_section("Test 2: Health Check")
    results.append(test_endpoint(
        "Health Check",
        "GET",
        f"{BASE_URL}/health/"
    ))
    
    # Test 3: Models Info
    print_section("Test 3: Models Information")
    results.append(test_endpoint(
        "Models Info",
        "GET",
        f"{BASE_URL}/models/info/"
    ))
    
    # Test 4: Predict - GET (Documentation)
    print_section("Test 4: Prediction Endpoint Documentation")
    results.append(test_endpoint(
        "Predict GET (Documentation)",
        "GET",
        f"{BASE_URL}/predict/"
    ))
    
    # Test 5: Predict - Earth-like Planet
    print_section("Test 5: Predict Earth-like Planet")
    earth_like_data = {
        "pl_rade": 1.0,
        "pl_eqt": 288,
        "pl_insol": 1.0,
        "pl_orbsmax": 1.0,
        "pl_orbper": 365.25,
        "st_teff": 5778,
        "st_rad": 1.0,
        "st_mass": 1.0,
        "stellar_type": "G"
    }
    results.append(test_endpoint(
        "Earth-like Planet Prediction",
        "POST",
        f"{BASE_URL}/predict/",
        earth_like_data
    ))
    
    # Test 6: Predict - Hot Jupiter
    print_section("Test 6: Predict Hot Jupiter")
    hot_jupiter_data = {
        "pl_rade": 11.2,
        "pl_eqt": 1500,
        "pl_insol": 500,
        "pl_orbper": 3.5,
        "st_teff": 6000,
        "stellar_type": "F"
    }
    results.append(test_endpoint(
        "Hot Jupiter Prediction",
        "POST",
        f"{BASE_URL}/predict/",
        hot_jupiter_data
    ))
    
    # Test 7: Predict - Super Earth
    print_section("Test 7: Predict Super Earth")
    super_earth_data = {
        "pl_rade": 1.5,
        "pl_eqt": 280,
        "pl_insol": 0.9,
        "pl_orbsmax": 1.1,
        "st_teff": 5200,
        "stellar_type": "K"
    }
    results.append(test_endpoint(
        "Super Earth Prediction",
        "POST",
        f"{BASE_URL}/predict/",
        super_earth_data
    ))
    
    # Test 8: Batch Predictions
    print_section("Test 8: Batch Predictions")
    batch_data = {
        "planets": [
            {
                "pl_rade": 1.2,
                "pl_eqt": 288,
                "st_teff": 5778
            },
            {
                "pl_rade": 0.8,
                "pl_eqt": 250,
                "st_teff": 4500
            },
            {
                "pl_rade": 2.0,
                "pl_eqt": 400,
                "st_teff": 6500
            }
        ],
        "mission": "auto"
    }
    results.append(test_endpoint(
        "Batch Predictions (3 planets)",
        "POST",
        f"{BASE_URL}/predict/batch/",
        batch_data
    ))
    
    # Test 9: Invalid Input
    print_section("Test 9: Invalid Input Validation")
    invalid_data = {
        "pl_rade": -1.0,  # Negative radius (invalid)
    }
    results.append(test_endpoint(
        "Invalid Input Test",
        "POST",
        f"{BASE_URL}/predict/",
        invalid_data,
        expected_status=400
    ))
    
    # Test 10: Empty Request
    print_section("Test 10: Empty Request Validation")
    results.append(test_endpoint(
        "Empty Request Test",
        "POST",
        f"{BASE_URL}/predict/",
        {},
        expected_status=400
    ))
    
    # Print Summary
    print("\n" + "=" * 80)
    print("  TEST SUMMARY")
    print("=" * 80)
    
    total_tests = len(results)
    passed_tests = sum(results)
    failed_tests = total_tests - passed_tests
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    if failed_tests == 0:
        print("\n🎉 All tests passed! Backend API is fully operational.")
        return 0
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please check the output above.")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)
