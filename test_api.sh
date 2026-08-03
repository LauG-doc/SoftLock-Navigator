#!/bin/bash

echo "======================================"
echo "Casebook API Test Suite"
echo "======================================"
echo

echo "1. Health Check"
echo "--------------------------------------"
curl -s http://localhost:3000/health | python3 -m json.tool
echo

echo "2. API Root"
echo "--------------------------------------"
curl -s http://localhost:3000/ | python3 -m json.tool
echo

echo "3. Validation Summary"
echo "--------------------------------------"
curl -s http://localhost:3000/api/validation | python3 -m json.tool
echo

echo "4. Sources Summary"
echo "--------------------------------------"
curl -s http://localhost:3000/api/sources | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total Files: {len(data[\"sources\"])}')
print(f'Loaded Successfully: {data[\"summary\"][\"loaded_files\"]}')
print(f'Total Rows: {data[\"summary\"][\"total_rows\"]}')
print()
print('Files:')
for source in data['sources']:
    status = '✅' if source['is_loaded'] else '❌'
    print(f'  {status} {source[\"file_name\"]} ({source[\"row_count\"]} rows)')
"
echo

echo "5. Data Quality Issues"
echo "--------------------------------------"
curl -s http://localhost:3000/api/data-quality | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Errors: {len(data[\"issues_by_severity\"][\"error\"])}')
print(f'Warnings: {len(data[\"issues_by_severity\"][\"warning\"])}')
print()
print('Critical Issues:')
for issue in data['issues_by_severity']['error']:
    print(f'  🔴 {issue[\"file\"]}: {issue[\"description\"]}')
print()
print(f'Test Data Files: {len(data[\"test_data_files\"])}')
for file in data['test_data_files']:
    print(f'  ⚠️  {file}')
"
echo

echo "======================================"
echo "All Tests Complete!"
echo "======================================"
