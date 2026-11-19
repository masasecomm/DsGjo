"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Building2, ChevronDown, MapPin, Search } from "lucide-react";

export function JobSearchForm({
  variant,
  provinces,
  departments: initialDepartments,
  departmentsByProvince = {},
  query = "",
  province: initialProvince = "",
  department: initialDepartment = "",
}: {
  variant: "home" | "list";
  provinces: string[];
  departments: string[];
  departmentsByProvince?: Record<string, string[]>;
  query?: string;
  province?: string;
  department?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const form = formRef.current;
    if (!form) return;
    const queryInput = form.elements.namedItem("q");
    const provinceInput = form.elements.namedItem("province");
    const departmentInput = form.elements.namedItem("department");
    if (queryInput instanceof HTMLInputElement && params.has("q")) queryInput.value = params.get("q") ?? "";
    if (provinceInput instanceof HTMLSelectElement && params.has("province")) provinceInput.value = params.get("province") ?? "";
    if (!(provinceInput instanceof HTMLSelectElement) || !(departmentInput instanceof HTMLSelectElement)) return;
    const updateDepartmentOptions = () => {
      const selectedProvince = provinceInput.value;
      const options = selectedProvince ? departmentsByProvince[selectedProvince] ?? initialDepartments : initialDepartments;
      const selectedDepartment = departmentInput.value;
      departmentInput.replaceChildren(
        new Option("All Departments", ""),
        ...options.map((name) => new Option(name, name)),
      );
      if (options.includes(selectedDepartment)) departmentInput.value = selectedDepartment;
    };
    updateDepartmentOptions();
    if (params.has("department")) departmentInput.value = params.get("department") ?? "";
    provinceInput.addEventListener("change", updateDepartmentOptions);
    return () => provinceInput.removeEventListener("change", updateDepartmentOptions);
  }, [departmentsByProvince, initialDepartments]);

  if (variant === "home") {
    return (
      <form action="/jobs" className="home-search" ref={formRef}>
        <label className="home-search-field home-search-keywords">
          <Search size={21} aria-hidden="true" />
          <input aria-label="Job title or keywords" defaultValue={query} name="q" placeholder="Job title, keywords..." />
        </label>
        <label className="home-search-field">
          <MapPin size={21} aria-hidden="true" />
          <span className="home-search-select">
            <select
              aria-label="Province"
              name="province"
              defaultValue={initialProvince}
            >
              <option value="">All Provinces</option>
              {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className="home-search-field">
          <Building2 size={20} aria-hidden="true" />
          <span className="home-search-select">
            <select
              aria-label="Department"
              name="department"
              defaultValue={initialDepartment}
            >
              <option value="">All Departments</option>
              {initialDepartments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <button type="submit">Find Jobs <ArrowRight size={17} /></button>
      </form>
    );
  }

  return (
    <form action="/jobs" className="list-toolbar" ref={formRef}>
      <input aria-label="Search vacancies" defaultValue={query} name="q" placeholder="Search title, department or location" />
      <select
        aria-label="Province"
        name="province"
        defaultValue={initialProvince}
      >
        <option value="">All Provinces</option>
        {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <select
        aria-label="Department"
        name="department"
        defaultValue={initialDepartment}
      >
        <option value="">All Departments</option>
        {initialDepartments.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <button className="form-button" type="submit"><Search size={16} /> Search</button>
    </form>
  );
}
