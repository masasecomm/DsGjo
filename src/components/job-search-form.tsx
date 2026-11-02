"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, ChevronDown, MapPin, Search } from "lucide-react";

export function JobSearchForm({
  variant,
  provinces,
  departments: initialDepartments,
  query = "",
  province: initialProvince = "",
  department: initialDepartment = "",
}: {
  variant: "home" | "list";
  provinces: string[];
  departments: string[];
  query?: string;
  province?: string;
  department?: string;
}) {
  const [province, setProvince] = useState(initialProvince);
  const [department, setDepartment] = useState(initialDepartment);
  const [departments, setDepartments] = useState(initialDepartments);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/public/job-filters?province=${encodeURIComponent(province)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { departments?: unknown; error?: unknown };
        if (!response.ok) {
          throw new Error(typeof result.error === "string" ? result.error : "Could not load departments.");
        }
        const nextDepartments = result.departments;
        if (!Array.isArray(nextDepartments) || !nextDepartments.every((item) => typeof item === "string")) {
          throw new Error("The department list returned an invalid response.");
        }
        setDepartments(nextDepartments);
        setDepartment((current) => nextDepartments.includes(current) ? current : "");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDepartmentError(error instanceof Error ? error.message : "Could not load departments.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDepartments(false);
      });

    return () => controller.abort();
  }, [province]);

  if (variant === "home") {
    return (
      <form action="/jobs" className="home-search">
        <label className="home-search-field home-search-keywords">
          <Search size={21} aria-hidden="true" />
          <input aria-label="Job title or keywords" name="q" placeholder="Job title, keywords..." />
        </label>
        <label className="home-search-field">
          <MapPin size={21} aria-hidden="true" />
          <span className="home-search-select">
            <select
              aria-label="Province"
              name="province"
              onChange={(event) => {
                setProvince(event.currentTarget.value);
                setDepartment("");
                setDepartmentError("");
                setLoadingDepartments(true);
              }}
              value={province}
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
              disabled={loadingDepartments || Boolean(departmentError)}
              name="department"
              onChange={(event) => setDepartment(event.currentTarget.value)}
              value={department}
            >
              <option value="">All Departments</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <button type="submit">Find Jobs <ArrowRight size={17} /></button>
        {departmentError && <span className="job-filter-error" role="alert">{departmentError}</span>}
      </form>
    );
  }

  return (
    <form action="/jobs" className="list-toolbar">
      <input aria-label="Search vacancies" defaultValue={query} name="q" placeholder="Search title, department or location" />
      <select
        aria-label="Province"
        name="province"
        onChange={(event) => {
          setProvince(event.currentTarget.value);
          setDepartment("");
          setDepartmentError("");
          setLoadingDepartments(true);
        }}
        value={province}
      >
        <option value="">All Provinces</option>
        {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <select
        aria-label="Department"
        disabled={loadingDepartments || Boolean(departmentError)}
        name="department"
        onChange={(event) => setDepartment(event.currentTarget.value)}
        value={department}
      >
        <option value="">All Departments</option>
        {departments.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <button className="form-button" type="submit"><Search size={16} /> Search</button>
      {departmentError && <span className="job-filter-error" role="alert">{departmentError}</span>}
    </form>
  );
}
