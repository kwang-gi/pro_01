import pygame
import time
import random

# Pygame 초기화
pygame.init()

# 색상 정의
white = (255, 255, 255)
yellow = (255, 255, 102)
black = (0, 0, 0)
red = (213, 50, 80)
green = (0, 255, 0)
blue = (50, 153, 213)

# 게임 화면 크기 설정
dis_width = 800
dis_height = 600

# 게임 화면 생성
dis = pygame.display.set_mode((dis_width, dis_height))
pygame.display.set_caption('지렁이 게임 by Jules')

# 게임 시간 설정을 위한 Clock 객체
clock = pygame.time.Clock()

# 뱀의 크기와 속도 설정
snake_block = 10
snake_speed = 15

# 폰트 설정
font_style = pygame.font.SysFont("bahnschrift", 25)
score_font = pygame.font.SysFont("comicsansms", 35)

def Your_score(score):
    """점수를 화면에 표시하는 함수"""
    value = score_font.render("Your Score: " + str(score), True, yellow)
    dis.blit(value, [0, 0])

def our_snake(snake_block, snake_list):
    """뱀을 그리는 함수"""
    for x in snake_list:
        pygame.draw.rect(dis, black, [x[0], x[1], snake_block, snake_block])

def message(msg, color):
    """메시지를 화면 중앙에 표시하는 함수"""
    mesg = font_style.render(msg, True, color)
    dis.blit(mesg, [dis_width / 6, dis_height / 3])

def gameLoop():
    """메인 게임 루프"""
    game_over = False
    game_close = False

    # 뱀의 초기 위치 (화면 중앙)
    x1 = dis_width / 2
    y1 = dis_height / 2

    # 뱀의 위치 변화량
    x1_change = 0
    y1_change = 0

    # 뱀의 몸통을 저장할 리스트
    snake_List = []
    Length_of_snake = 1

    # 먹이의 초기 위치 (무작위)
    foodx = round(random.randrange(0, dis_width - snake_block) / 10.0) * 10.0
    foody = round(random.randrange(0, dis_height - snake_block) / 10.0) * 10.0

    while not game_over:

        # 게임 오버 시 처리
        while game_close == True:
            dis.fill(blue)
            message("You Lost! Press C-Play Again or Q-Quit", red)
            Your_score(Length_of_snake - 1)
            pygame.display.update()

            for event in pygame.event.get():
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_q:
                        game_over = True
                        game_close = False
                    if event.key == pygame.K_c:
                        gameLoop() # 새로운 게임 시작

        # 이벤트 처리 (키보드 입력, 종료)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                game_over = True
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_LEFT:
                    x1_change = -snake_block
                    y1_change = 0
                elif event.key == pygame.K_RIGHT:
                    x1_change = snake_block
                    y1_change = 0
                elif event.key == pygame.K_UP:
                    y1_change = -snake_block
                    x1_change = 0
                elif event.key == pygame.K_DOWN:
                    y1_change = snake_block
                    x1_change = 0

        # 뱀이 벽에 부딪혔는지 확인
        if x1 >= dis_width or x1 < 0 or y1 >= dis_height or y1 < 0:
            game_close = True

        # 뱀의 위치 업데이트
        x1 += x1_change
        y1 += y1_change
        dis.fill(blue)

        # 먹이 그리기
        pygame.draw.rect(dis, green, [foodx, foody, snake_block, snake_block])

        # 뱀의 머리 위치 추가
        snake_Head = []
        snake_Head.append(x1)
        snake_Head.append(y1)
        snake_List.append(snake_Head)

        # 뱀의 길이가 길어지면 꼬리 제거
        if len(snake_List) > Length_of_snake:
            del snake_List[0]

        # 뱀이 자기 자신에게 부딪혔는지 확인
        for x in snake_List[:-1]:
            if x == snake_Head:
                game_close = True

        # 뱀 그리기
        our_snake(snake_block, snake_List)
        # 점수 표시
        Your_score(Length_of_snake - 1)

        # 화면 업데이트
        pygame.display.update()

        # 뱀이 먹이를 먹었는지 확인
        if x1 == foodx and y1 == foody:
            foodx = round(random.randrange(0, dis_width - snake_block) / 10.0) * 10.0
            foody = round(random.randrange(0, dis_height - snake_block) / 10.0) * 10.0
            Length_of_snake += 1

        # 게임 속도 조절
        clock.tick(snake_speed)

    pygame.quit()
    quit()

# 게임 시작
gameLoop()
