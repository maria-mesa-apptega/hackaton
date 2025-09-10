#!/usr/bin/env node

/**
 * Simple test script for the Compliance Copilot API
 * Run this after starting the API server to test the /ask endpoint
 */

const API_URL = process.env.API_URL || 'http://localhost:8000';

async function testAPI() {
  console.log('🧪 Testing Apptega Compliance Copilot API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log('');

    // Test API info endpoint
    console.log('2. Testing API info endpoint...');
    const apiResponse = await fetch(`${API_URL}/api`);
    const apiData = await apiResponse.json();
    console.log('✅ API info:', apiData.message);
    console.log('');

    // Test compliance question (if AWS credentials are configured)
    console.log('3. Testing compliance question...');
    const questionResponse = await fetch(`${API_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'What is SOC2 and why is it important?'
      })
    });

    const questionData = await questionResponse.json();
    
    if (questionData.success) {
      console.log('✅ Compliance question answered successfully!');
      console.log('📋 Executive Summary:', questionData.data.executiveSummary);
      console.log('🔧 Technical Details:', questionData.data.technicalDetails.length, 'items');
      console.log('🎯 Apptega Actions:', questionData.data.apptegaActions.length, 'items');
    } else {
      console.log('❌ Compliance question failed:', questionData.message);
      console.log('💡 Make sure AWS credentials are configured in .env file');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the API server is running on', API_URL);
  }
}

// Run the test
testAPI();
