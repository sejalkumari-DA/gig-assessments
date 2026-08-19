'use client';

import { useState } from 'react';

export default function CandidateForm({ onSubmit, defaultValues }: { onSubmit: (data: any) => void, defaultValues: any }) {
  const [formData, setFormData] = useState({
    firstName: defaultValues?.firstName || '',
    lastName: defaultValues?.lastName || '',
    email: defaultValues?.email || '',
    phone: defaultValues?.phone || '',
    location: defaultValues?.location || '',
    experience: defaultValues?.experience || '',
    company: defaultValues?.company || '',
    qualification: defaultValues?.qualification || '',
    skills: defaultValues?.skills || '',
    linkedin: defaultValues?.linkedin || '',
    portfolio: defaultValues?.portfolio || '',
    salary: defaultValues?.salary || '',
    noticePeriod: defaultValues?.noticePeriod || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Candidate Information</h2>
        <p className="text-gray-400">Please provide your details to proceed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">First Name <span className="text-red-500">*</span></label>
          <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Last Name <span className="text-red-500">*</span></label>
          <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Doe" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Email Address <span className="text-red-500">*</span></label>
          <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@example.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Phone Number <span className="text-red-500">*</span></label>
          <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="+1 (555) 000-0000" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Current Location <span className="text-red-500">*</span></label>
          <input required name="location" value={formData.location} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="City, Country" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Years of Experience <span className="text-red-500">*</span></label>
          <input required name="experience" value={formData.experience} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. 5 Years" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Current Company</label>
          <input name="company" value={formData.company} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Highest Qualification <span className="text-red-500">*</span></label>
          <input required name="qualification" value={formData.qualification} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. Bachelor's in CS" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Primary Skills <span className="text-red-500">*</span></label>
        <input required name="skills" value={formData.skills} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="React, Node.js, Python (comma separated)" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">LinkedIn URL</label>
          <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Portfolio URL</label>
          <input type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="https://..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Expected Salary</label>
          <input name="salary" value={formData.salary} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. $100k - $120k" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Notice Period</label>
          <select name="noticePeriod" value={formData.noticePeriod} onChange={handleChange} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
            <option value="">Select...</option>
            <option value="Immediate">Immediate</option>
            <option value="15 Days">15 Days</option>
            <option value="1 Month">1 Month</option>
            <option value="2 Months">2 Months</option>
            <option value="3 Months+">3 Months+</option>
          </select>
        </div>
      </div>

      <div className="pt-6">
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
          Continue to Resume Upload
        </button>
      </div>
    </form>
  );
}
