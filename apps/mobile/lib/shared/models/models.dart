// lib/shared/models/models.dart
// 앱 전체에서 사용하는 데이터 모델

enum WageType { hourly, daily, weekly, monthly }

enum AttendanceStatus { normal, late, absent, vacation, holiday }

enum AttendanceState { before, working, done }

enum LeaveType { annual, half, sick, official }

enum LeaveStatus { pending, approved, rejected }

enum NotificationType {
  overtimeApproved,
  overtimeRejected,
  leaveApproved,
  leaveRejected,
  payrollIssued,
}

class User {
  final String id;
  final String name;
  final String? email;
  final String? image;
  final bool onboardingCompleted;
  final List<Employment> employments;

  User({
    required this.id,
    required this.name,
    this.email,
    this.image,
    required this.onboardingCompleted,
    required this.employments,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String?,
        image: json['image'] as String?,
        onboardingCompleted: json['onboardingCompleted'] as bool? ?? false,
        employments: (json['employments'] as List<dynamic>? ?? [])
            .map((e) => Employment.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  User copyWith({
    String? id,
    String? name,
    String? email,
    String? image,
    bool? onboardingCompleted,
    List<Employment>? employments,
  }) =>
      User(
        id: id ?? this.id,
        name: name ?? this.name,
        email: email ?? this.email,
        image: image ?? this.image,
        onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
        employments: employments ?? this.employments,
      );
}

class Company {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final double radiusMeters;

  Company({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  factory Company.fromJson(Map<String, dynamic> json) => Company(
        id: json['id'] as String,
        name: json['name'] as String,
        address: json['address'] as String? ?? '',
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 100.0,
      );
}

class Employment {
  final String id;
  final String userId;
  final String companyId;
  final Company company;
  final String position;
  final String? department;
  final WageType wageType;
  final double? hourlyWage;
  final double? dailyWage;
  final double? weeklyWage;
  final double? monthlyWage;
  final double dailyWorkHours;
  final int weeklyWorkDays;
  final String? workStartTime;
  final String? workEndTime;
  final List<int>? workDaysOfWeek;
  final int? breakMinutes;
  final bool isPrimary;
  final bool isActive;
  final String? endedAt;
  final double annualLeaveBalance;
  final String? hireDate;
  final String? memo;
  final String employeeCount;

  Employment({
    required this.id,
    required this.userId,
    required this.companyId,
    required this.company,
    required this.position,
    this.department,
    required this.wageType,
    this.hourlyWage,
    this.dailyWage,
    this.weeklyWage,
    this.monthlyWage,
    required this.dailyWorkHours,
    required this.weeklyWorkDays,
    this.workStartTime,
    this.workEndTime,
    this.workDaysOfWeek,
    this.breakMinutes,
    required this.isPrimary,
    required this.isActive,
    this.endedAt,
    this.annualLeaveBalance = 15.0,
    this.hireDate,
    this.memo,
    this.employeeCount = 'over5',
  });

  factory Employment.fromJson(Map<String, dynamic> json) => Employment(
        id: json['id'] as String,
        userId: json['userId'] as String,
        companyId: json['companyId'] as String,
        company: Company.fromJson(json['company'] as Map<String, dynamic>),
        annualLeaveBalance: (json['annualLeaveBalance'] as num?)?.toDouble() ?? 15.0,
        position: json['position'] as String? ?? '',
        department: json['department'] as String?,
        wageType: _parseWageType(json['wageType'] as String?),
        hourlyWage: (json['hourlyWage'] as num?)?.toDouble(),
        dailyWage: (json['dailyWage'] as num?)?.toDouble(),
        weeklyWage: (json['weeklyWage'] as num?)?.toDouble(),
        monthlyWage: (json['monthlyWage'] as num?)?.toDouble(),
        dailyWorkHours: (json['dailyWorkHours'] as num?)?.toDouble() ?? 8.0,
        weeklyWorkDays: json['weeklyWorkDays'] as int? ?? 5,
        workStartTime: json['workStartTime'] as String?,
        workEndTime: json['workEndTime'] as String?,
        workDaysOfWeek: (json['workDaysOfWeek'] as List<dynamic>?)
            ?.map((e) => e as int)
            .toList(),
        breakMinutes: json['breakMinutes'] as int?,
        isPrimary: json['isPrimary'] as bool? ?? false,
        isActive: json['isActive'] as bool? ?? true,
        endedAt: json['endedAt'] as String?,
        hireDate: json['hireDate'] != null
            ? (json['hireDate'] as String).substring(0, 10)
            : null,
        memo: json['memo'] as String?,
        employeeCount: json['employeeCount'] as String? ?? 'over5',
      );

  static WageType _parseWageType(String? value) {
    switch (value) {
      case 'daily': return WageType.daily;
      case 'weekly': return WageType.weekly;
      case 'monthly': return WageType.monthly;
      default: return WageType.hourly;
    }
  }

  int get effectiveWeeklyWorkDays =>
      workDaysOfWeek?.length ?? weeklyWorkDays;
}

class AttendanceRecord {
  final String id;
  final String companyId;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final AttendanceStatus status;
  final int? workedMinutes;
  final int? overtimeMinutes;
  final int? nightMinutes;
  final double? distance;

  AttendanceRecord({
    required this.id,
    required this.companyId,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.status,
    this.workedMinutes,
    this.overtimeMinutes,
    this.nightMinutes,
    this.distance,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status'] as String? ?? 'normal';
    final statusMap = {
      'normal': AttendanceStatus.normal,
      'late': AttendanceStatus.late,
      'absent': AttendanceStatus.absent,
      'vacation': AttendanceStatus.vacation,
      'holiday': AttendanceStatus.holiday,
    };
    return AttendanceRecord(
      id: json['id'] as String,
      companyId: json['companyId'] as String? ?? '',
      date: json['date'] as String,
      checkIn: json['checkIn'] as String?,
      checkOut: json['checkOut'] as String?,
      status: statusMap[statusStr] ?? AttendanceStatus.normal,
      workedMinutes: json['workedMinutes'] as int?,
      overtimeMinutes: json['overtimeMinutes'] as int?,
      nightMinutes: json['nightMinutes'] as int?,
      distance: (json['distance'] as num?)?.toDouble(),
    );
  }
}

class PayrollRecord {
  final String id;
  final String companyId;
  final int year;
  final int month;
  final double basePay;
  final double holidayPay;
  final double overtimePay;
  final double nightPay;
  final double totalGross;
  final double nationalPension;
  final double healthInsurance;
  final double employmentInsurance;
  final double incomeTax;
  final double totalDeduction;
  final double netPay;
  final String? paidAt;
  final bool confirmed;
  final int workedDays;

  PayrollRecord({
    required this.id,
    required this.companyId,
    required this.year,
    required this.month,
    required this.basePay,
    required this.holidayPay,
    required this.overtimePay,
    required this.nightPay,
    required this.totalGross,
    required this.nationalPension,
    required this.healthInsurance,
    required this.employmentInsurance,
    required this.incomeTax,
    required this.totalDeduction,
    required this.netPay,
    this.paidAt,
    required this.confirmed,
    required this.workedDays,
  });

  factory PayrollRecord.fromJson(Map<String, dynamic> json) => PayrollRecord(
        id: json['id'] as String,
        companyId: json['companyId'] as String? ?? '',
        year: json['year'] as int,
        month: json['month'] as int,
        basePay: (json['basePay'] as num).toDouble(),
        holidayPay: (json['holidayPay'] as num?)?.toDouble() ?? 0,
        overtimePay: (json['overtimePay'] as num?)?.toDouble() ?? 0,
        nightPay: (json['nightPay'] as num?)?.toDouble() ?? 0,
        totalGross: (json['totalGross'] as num).toDouble(),
        nationalPension: (json['nationalPension'] as num?)?.toDouble() ?? 0,
        healthInsurance: (json['healthInsurance'] as num?)?.toDouble() ?? 0,
        employmentInsurance:
            (json['employmentInsurance'] as num?)?.toDouble() ?? 0,
        incomeTax: (json['incomeTax'] as num?)?.toDouble() ?? 0,
        totalDeduction: (json['totalDeduction'] as num?)?.toDouble() ?? 0,
        netPay: (json['netPay'] as num).toDouble(),
        paidAt: json['paidAt'] as String?,
        confirmed: json['confirmed'] as bool? ?? false,
        workedDays: json['workedDays'] as int? ?? 0,
      );
}

class LeaveRecord {
  final String id;
  final String companyId;
  final LeaveType type;
  final String startDate;
  final String endDate;
  final double days;
  final String reason;
  final LeaveStatus status;
  final String appliedAt;

  LeaveRecord({
    required this.id,
    required this.companyId,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.reason,
    required this.status,
    required this.appliedAt,
  });

  factory LeaveRecord.fromJson(Map<String, dynamic> json) {
    final typeMap = {
      'annual': LeaveType.annual,
      'half': LeaveType.half,
      'sick': LeaveType.sick,
      'official': LeaveType.official,
    };
    final statusMap = {
      'pending': LeaveStatus.pending,
      'approved': LeaveStatus.approved,
      'rejected': LeaveStatus.rejected,
    };
    return LeaveRecord(
      id: json['id'] as String,
      companyId: json['companyId'] as String? ?? '',
      type: typeMap[json['type']] ?? LeaveType.annual,
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String,
      days: (json['days'] as num).toDouble(),
      reason: json['reason'] as String? ?? '',
      status: statusMap[json['status']] ?? LeaveStatus.pending,
      appliedAt: json['appliedAt'] as String,
    );
  }
}

class AppNotification {
  final String id;
  final String companyId;
  final String type;
  final String title;
  final String body;
  final bool read;
  final String createdAt;

  AppNotification({
    required this.id,
    required this.companyId,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        companyId: json['companyId'] as String? ?? '',
        type: json['type'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        read: json['read'] as bool? ?? false,
        createdAt: json['createdAt'] as String,
      );
}
