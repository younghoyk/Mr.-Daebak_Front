import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/axios';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  // API 명세서의 RegisterDto에 맞춘 상태값
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    displayName: '', // 고객 성명
    phoneNumber: '',
    address: '',
  });

  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API 호출: POST /api/users/register
      await apiClient.post('/users/register', formData);
      
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      // 에러 메시지 처리 (백엔드 에러 응답 구조에 따라 다를 수 있음)
      setError('회원가입에 실패했습니다. 입력 정보를 확인해주세요.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            미스터 대박의 특별한 서비스를 만나보세요
          </p>
        </div>
        
        <form className="mt-8 space-y-4" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm space-y-3">
            {/* 아이디 */}
            <div>
              <label htmlFor="username" className="sr-only">아이디</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="아이디"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* 이름 (DisplayName) */}
            <div>
              <label htmlFor="displayName" className="sr-only">이름</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="이름 (실명)"
                value={formData.displayName}
                onChange={handleChange}
              />
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="sr-only">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="phoneNumber" className="sr-only">전화번호</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="전화번호 (예: 010-1234-5678)"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            {/* 주소 */}
            <div>
              <label htmlFor="address" className="sr-only">주소</label>
              <input
                id="address"
                name="address"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="주소 (배달 받으실 곳)"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              가입하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};