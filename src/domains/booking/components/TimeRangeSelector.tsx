  // 선택된 시간이 변경될 때마다 부모 컴포넌트에 알림
  useEffect(() => {
    if (selectedSlots.length > 0) {
      // 시간 정렬
      const sortedSlots = [...selectedSlots].sort((a, b) => {
        const [aHours, aMinutes] = a.split(":").map(Number);
        const [bHours, bMinutes] = b.split(":").map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });
      
      const startTime = sortedSlots[0];
      
      // 마지막 슬롯 시간에서 30분을 더한 시간이 종료 시간
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const [lastHours, lastMinutes] = lastSlot.split(":").map(Number);
      
      let endHours = lastHours;
      let endMinutes = lastMinutes + 30;
      
      if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
      }

      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // 선택 시간 계산
      const duration = selectedSlots.length * 0.5; // 각 슬롯은 30분 (0.5시간)
      const price = Math.round(duration * pricePerHour);
      
      onTimeRangeChange(startTime, endTime, duration, price);
    } else {
      onTimeRangeChange("", "", 0, 0);
    }
  }, [selectedSlots, pricePerHour]); // onTimeRangeChange 제거